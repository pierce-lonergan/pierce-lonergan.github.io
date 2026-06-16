/* =========================================================================
   Pierce Lonergan - in-browser AI assistant ("ask my resume anything")

   Pipeline, all client-side, no server, no API keys:
     1. Retrieval  - embed the resume knowledge base + the question with
                     Transformers.js (CDN), cosine search for the top matches.
                     Falls back to keyword overlap if the model will not load.
     2. Generation - WebLLM runs a small LLM on WebGPU and answers from the
                     retrieved context. Where WebGPU is absent (or the model
                     fails) it answers with a fast extractive summary instead.

   Every layer is wrapped so a failure degrades rather than breaking the page.
   ========================================================================= */
(function () {
  "use strict";

  var EMBED_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
  var EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
  var WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm@0.2.84";
  var LLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  var TOP_K = 4;
  var REFUSE_AT = 0.26; // below this top cosine, refuse honestly rather than let the model invent
  var LI = "https://www.linkedin.com/in/pierce-lonergan-84034422a/";

  var KB = window.PL_KB || [];

  var state = {
    open: false, greeted: false, busy: false,
    webgpu: !!navigator.gpu,
    embedder: null, embedPromise: null, kbVecs: null,
    engine: null, enginePromise: null, engineReady: false, llmFailed: false
  };

  /* ----------------------------------------------------------- utilities */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function linkify(s) {
    return s
      .replace(/linkedin\.com\/in\/pierce-lonergan-84034422a/g, '<a href="' + LI + '" target="_blank" rel="noopener">linkedin.com/in/pierce-lonergan</a>')
      .replace(/github\.com\/pierce-lonergan(?![\/<])/g, '<a href="https://github.com/pierce-lonergan" target="_blank" rel="noopener">github.com/pierce-lonergan</a>');
  }
  function renderText(s) { return linkify(esc(s)).replace(/\n/g, "<br>"); }

  /* ----------------------------------------------------------- retrieval */
  function cosine(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; } // vectors are normalized

  function ensureEmbedder() {
    if (state.embedder) return Promise.resolve(state.embedder);
    if (state.embedPromise) return state.embedPromise;
    state.embedPromise = import(EMBED_CDN)
      .then(function (mod) { return mod.pipeline("feature-extraction", EMBED_MODEL); })
      .then(function (ex) { state.embedder = ex; return ex; });
    return state.embedPromise;
  }

  function embed(ex, text) {
    return ex(text, { pooling: "mean", normalize: true }).then(function (out) { return Array.prototype.slice.call(out.data); });
  }

  function ensureKbVecs(ex) {
    if (state.kbVecs) return Promise.resolve(state.kbVecs);
    var vecs = [], p = Promise.resolve();
    KB.forEach(function (item, i) { p = p.then(function () { return embed(ex, item.text).then(function (v) { vecs[i] = v; }); }); });
    return p.then(function () { state.kbVecs = vecs; return vecs; });
  }

  function retrieveSemantic(query) {
    return ensureEmbedder().then(function (ex) {
      return ensureKbVecs(ex).then(function (vecs) {
        return embed(ex, query).then(function (qv) {
          var scored = KB.map(function (item, i) { return { item: item, score: cosine(qv, vecs[i]) }; });
          scored.sort(function (a, b) { return b.score - a.score; });
          return scored.slice(0, TOP_K);
        });
      });
    });
  }

  function retrieveKeyword(query) {
    var words = query.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; });
    var scored = KB.map(function (item) {
      var t = (item.topic + " " + item.text).toLowerCase(), s = 0;
      words.forEach(function (w) { if (t.indexOf(w) >= 0) s++; });
      return { item: item, score: s };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    if (!scored.length || scored[0].score === 0) return scored.slice(0, 2);
    return scored.filter(function (x) { return x.score > 0; }).slice(0, TOP_K);
  }

  function retrieve(query) {
    return retrieveSemantic(query).then(function (r) { state.lastMode = "semantic"; return r; })
      .catch(function () { return retrieveKeyword(query).then(function (r) { state.lastMode = "keyword"; return r; }); });
  }

  /* ---------------------------------------------------------- generation */
  function ensureEngine(onProgress) {
    if (state.engine && state.engineReady) return Promise.resolve(state.engine);
    if (state.enginePromise) return state.enginePromise;
    state.enginePromise = import(WEBLLM_CDN)
      .then(function (webllm) { return webllm.CreateMLCEngine(LLM_MODEL, { initProgressCallback: function (r) { if (onProgress) onProgress(r); } }); })
      .then(function (engine) { state.engine = engine; state.engineReady = true; return engine; })
      .catch(function (e) { state.llmFailed = true; state.enginePromise = null; throw e; });
    return state.enginePromise;
  }

  function buildMessages(query, contexts) {
    var ctx = contexts.map(function (c, i) { return "[" + (i + 1) + "] " + c.item.text; }).join("\n");
    var sys = "You are the portfolio assistant for Pierce Lonergan, a Software Engineer III at JPMorganChase. " +
      "Answer questions about Pierce in a concise, friendly, professional tone, in the third person. " +
      "Use ONLY the facts in the context below. If the answer is not in the context, say you are not sure and suggest connecting with Pierce on LinkedIn. " +
      "Keep answers to a few sentences and do not invent facts.\n\nContext about Pierce:\n" + ctx;
    return [{ role: "system", content: sys }, { role: "user", content: query }];
  }

  function extractiveAnswer(query, contexts) {
    var good = contexts.filter(function (c) { return c.score == null || c.score > 0.18 || c.score >= 1; });
    var picked = (good.length ? good : contexts).slice(0, 3).map(function (c) { return c.item.text; });
    if (!picked.length) return "I am not sure about that one. The best way to get an answer is to reach Pierce on LinkedIn.";
    return "Here is what is most relevant from Pierce's background:\n\n" + picked.map(function (t) { return "- " + t; }).join("\n\n");
  }

  async function streamInto(engine, messages, onPartial) {
    var stream = await engine.chat.completions.create({ messages: messages, stream: true, temperature: 0.4, max_tokens: 420 });
    var full = "";
    for await (var chunk of stream) {
      var d = chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
      if (d) { full += d; onPartial(full); }
    }
    return full;
  }

  /* ------------------------------------------------------------------ UI */
  var ui = {};

  function buildUI() {
    var launcher = el("button", "cb-launcher");
    launcher.id = "cbLauncher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open the AI assistant");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 20l1.4-4.5A8.38 8.38 0 0 1 3.5 11 8.5 8.5 0 0 1 12 2.5a8.38 8.38 0 0 1 9 9z"/><circle cx="8.5" cy="11.5" r="1"/><circle cx="12" cy="11.5" r="1"/><circle cx="15.5" cy="11.5" r="1"/></svg>' +
      '<span class="cb-launcher-label">Ask AI</span>';

    var panel = el("section", "cb-panel");
    panel.id = "cbPanel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Ask my resume anything");
    panel.hidden = true;
    panel.innerHTML =
      '<header class="cb-head">' +
        '<span class="cb-avatar" aria-hidden="true">PL</span>' +
        '<div class="cb-head-txt"><strong>Ask my résumé anything</strong><span class="cb-sub" id="cbSub">in-browser AI</span></div>' +
        '<button class="cb-close" id="cbClose" type="button" aria-label="Close assistant"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '</header>' +
      '<div class="cb-msgs" id="cbMsgs" aria-live="polite"></div>' +
      '<div class="cb-chips" id="cbChips"></div>' +
      '<form class="cb-input" id="cbForm" autocomplete="off">' +
        '<input id="cbText" type="text" placeholder="Ask about Pierce\'s work..." aria-label="Your question" />' +
        '<button type="submit" class="cb-send" aria-label="Send question"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3.5-6.5L4 12z"/></svg></button>' +
      '</form>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    ui.launcher = launcher;
    ui.panel = panel;
    ui.msgs = panel.querySelector("#cbMsgs");
    ui.chips = panel.querySelector("#cbChips");
    ui.form = panel.querySelector("#cbForm");
    ui.text = panel.querySelector("#cbText");
    ui.sub = panel.querySelector("#cbSub");

    launcher.addEventListener("click", toggle);
    panel.querySelector("#cbClose").addEventListener("click", close);
    ui.form.addEventListener("submit", function (e) { e.preventDefault(); var q = ui.text.value.trim(); if (q) { ui.text.value = ""; send(q); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) close(); });
  }

  function renderChips() {
    var chips = ["What does Pierce do at JPMorganChase?", "Tell me about NexusMatcher", "His ML and retrieval experience?", "How do I contact him?"];
    ui.chips.innerHTML = "";
    chips.forEach(function (c) {
      var b = el("button", "cb-chip", esc(c));
      b.type = "button";
      b.addEventListener("click", function () { send(c); });
      ui.chips.appendChild(b);
    });
  }

  function addMsg(role, html) {
    var m = el("div", "cb-msg cb-" + role);
    var body = el("div", "cb-body", html || "");
    m.appendChild(body);
    var status = el("div", "cb-status");
    m.appendChild(status);
    ui.msgs.appendChild(m);
    ui.msgs.scrollTop = ui.msgs.scrollHeight;
    return { wrap: m, body: body, status: status };
  }

  function typingDots() { return '<span class="cb-dots"><i></i><i></i><i></i></span>'; }

  function setStatus(b, html) { b.status.innerHTML = html || ""; ui.msgs.scrollTop = ui.msgs.scrollHeight; }
  function setBody(b, html) { b.body.innerHTML = html; ui.msgs.scrollTop = ui.msgs.scrollHeight; }
  function setProgress(b, pct, label) {
    var p = pct == null ? "" : '<span class="cb-bar"><i style="width:' + pct + '%"></i></span>';
    var txt = (pct == null ? (label || "Preparing...") : ("Loading the in-browser model... " + pct + "%"));
    setStatus(b, '<span class="cb-load">' + esc(txt) + "</span>" + p);
  }

  // Visible RAG: surface which resume sections the semantic search retrieved.
  function renderRag(b, contexts) {
    if (!contexts || !contexts.length || !b || !b.wrap) return;
    var chips = contexts.slice(0, 4).map(function (c, i) {
      var topic = (c.item && c.item.topic) || "résumé";
      var pct = (c.score != null && c.score <= 1 && c.score > 0) ? Math.round(c.score * 100) + "%" : "";
      return '<span class="cb-rag-chip" style="--ci:' + i + '"' + (pct ? ' title="cosine similarity ' + pct + '"' : "") + ">" + esc(topic) + "</span>";
    }).join("");
    var el = document.createElement("div");
    el.className = "cb-rag";
    el.innerHTML = '<span class="cb-rag-label">retrieved</span>' + chips;
    b.wrap.insertBefore(el, b.body);
    ui.msgs.scrollTop = ui.msgs.scrollHeight;
    if (window.PL_galaxyHighlight) { try { window.PL_galaxyHighlight(contexts.map(function (c) { return c.item && c.item.topic; })); } catch (e) {} }
  }

  // Instrumented RAG: an honest trace of the retrieval+generation under each answer.
  function renderTrace(b, t, kind) {
    if (!b || !b.wrap) return;
    var topStr = (t.mode === "semantic") ? (Math.round(t.top * 100) + "% cosine") : (t.top + " keyword hits");
    var gen = kind === "llm" ? ("Llama-3.2-1B q4f16 · " + t.generateMs + " ms")
      : kind === "refused" ? "skipped (low confidence)"
      : "extractive (no WebGPU)";
    var d = document.createElement("details");
    d.className = "cb-trace";
    d.innerHTML = "<summary>trace</summary>" +
      '<div class="cb-trace-body">' +
        "<span>retrieve</span><b>" + t.retrieveMs + " ms · " + (t.mode === "semantic" ? "embed + cosine" : "keyword") + "</b>" +
        "<span>top match</span><b>" + esc(topStr) + "</b>" +
        "<span>generate</span><b>" + esc(gen) + "</b>" +
        "<span>index</span><b>" + KB.length + " chunks · MiniLM-L6-v2 384-d</b>" +
        "<span>privacy</span><b>100% on-device</b>" +
      "</div>";
    b.wrap.appendChild(d);
    ui.msgs.scrollTop = ui.msgs.scrollHeight;
  }

  function greet() {
    if (state.greeted) return;
    state.greeted = true;
    ui.sub.textContent = state.webgpu ? "in-browser AI · nothing leaves your device" : "on-device retrieval";
    var hello = state.webgpu
      ? "Hi, I am Pierce's in-browser assistant. Ask me about his work, projects, or background. I run a small language model fully in your browser with WebGPU, so the first question loads the model once, then answers are quick. Nothing you type leaves your device."
      : "Hi, I am Pierce's in-browser assistant. Ask me about his work, projects, or background. Your browser does not expose WebGPU, so I will answer with fast on-device retrieval over his résumé.";
    addMsg("assistant", renderText(hello));
    renderChips();
  }

  function open() {
    if (state.open) return;
    state.open = true;
    ui.panel.hidden = false;
    ui.launcher.setAttribute("aria-expanded", "true");
    ui.launcher.classList.add("cb-hidden");
    requestAnimationFrame(function () { ui.panel.classList.add("cb-show"); });
    greet();
    setTimeout(function () { ui.text.focus(); }, 60);
  }
  function close() {
    state.open = false;
    ui.panel.classList.remove("cb-show");
    ui.launcher.setAttribute("aria-expanded", "false");
    ui.launcher.classList.remove("cb-hidden");
    setTimeout(function () { if (!state.open) ui.panel.hidden = true; }, 220);
  }
  function toggle() { state.open ? close() : open(); }

  async function send(query) {
    if (state.busy) return;
    if (!state.open) open();
    state.busy = true;
    if (ui.chips) ui.chips.innerHTML = "";
    addMsg("user", renderText(query));
    var b = addMsg("assistant", typingDots());

    var trace = { mode: "", retrieveMs: 0, generateMs: 0, top: 0 };
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    try {
      setStatus(b, '<span class="cb-load">Searching Pierce\'s résumé...</span>');
      var t0 = now();
      var contexts = await retrieve(query);
      trace.retrieveMs = Math.round(now() - t0);
      trace.mode = state.lastMode || "semantic";
      trace.top = contexts[0] ? (contexts[0].score || 0) : 0;
      renderRag(b, contexts);

      // Honest refusal: when the best semantic match is weak, don't ask the model to invent.
      if (trace.mode === "semantic" && trace.top < REFUSE_AT) {
        setStatus(b, "");
        setBody(b, renderText("That's outside what's in Pierce's résumé here, so I won't guess. You can ask him directly on LinkedIn, or try his data-engineering work, his projects (NexusPay, NexusMatcher), or his ML and retrieval experience."));
        renderTrace(b, trace, "refused");
        return;
      }

      if (state.webgpu && !state.llmFailed) {
        if (!state.engineReady) {
          setBody(b, typingDots());
          setProgress(b, 0, "Loading the in-browser model...");
          await ensureEngine(function (r) {
            var pct = (r && r.progress != null) ? Math.round(r.progress * 100) : null;
            if (pct != null) setProgress(b, pct);
            else setStatus(b, '<span class="cb-load">' + esc((r && r.text) || "Preparing model...") + "</span>");
          });
        }
        setStatus(b, "");
        setBody(b, typingDots());
        b.body.classList.add("cb-streaming");
        var tg = now();
        var answer = await streamInto(state.engine, buildMessages(query, contexts), function (partial) { setBody(b, renderText(partial)); });
        trace.generateMs = Math.round(now() - tg);
        b.body.classList.remove("cb-streaming");
        if (!answer.trim()) setBody(b, renderText(extractiveAnswer(query, contexts)));
        renderTrace(b, trace, "llm");
      } else {
        setStatus(b, "");
        setBody(b, renderText(extractiveAnswer(query, contexts)));
        renderTrace(b, trace, "extractive");
      }
    } catch (err) {
      if (b && b.body) b.body.classList.remove("cb-streaming");
      try {
        var ctx2 = await retrieve(query);
        setStatus(b, "");
        setBody(b, renderText(extractiveAnswer(query, ctx2)) +
          '<div class="cb-note">Answered with on-device retrieval (the in-browser model did not load here).</div>');
      } catch (e2) {
        setStatus(b, "");
        setBody(b, 'I had trouble answering in the browser just now. You can reach Pierce on <a href="' + LI + '" target="_blank" rel="noopener">LinkedIn</a>.');
      }
    } finally {
      state.busy = false;
    }
  }

  /* ---------------------------------------------------------- bootstrap */
  function init() {
    if (!KB.length) return;
    buildUI();
    // One gentle nudge per session if the assistant goes unnoticed.
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !sessionStorage.getItem("pl-nudged")) {
        setTimeout(function () {
          if (state.open || !ui.launcher) return;
          sessionStorage.setItem("pl-nudged", "1");
          ui.launcher.classList.add("cb-nudge");
          setTimeout(function () { ui.launcher.classList.remove("cb-nudge"); }, 1600);
        }, 12000);
      }
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
