/* =========================================================================
   Pierce Lonergan - command palette (Cmd/Ctrl + K)
   A keyboard-driven launcher: fuzzy-search actions, jump to sections, open
   the AI assistant, toggle theme, grab the resume, inject chaos. No deps.
   ========================================================================= */
(function () {
  "use strict";

  var ICON = {
    jump: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.5 7.3L3 20l1.4-4.5A8.4 8.4 0 1 1 21 11.5z"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    theme: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    bolt: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>'
  };

  function svg(p) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function buildCommands() {
    var c = [];
    [
      ["platform", "The platform, running"], ["about", "Who is building it"], ["experience", "What the work earned"],
      ["skills", "What I reach for"], ["education", "Where the habit started"], ["dataflow", "Where the volume goes"],
      ["projects", "Built unsupervised"], ["embedding", "Watch it retrieve"], ["fit", "Measure me (paste a JD)"], ["contact", "Contact"]
    ].forEach(function (s) {
      if (!document.getElementById(s[0])) return;
      c.push({ title: "Go to " + s[1], keywords: s[1] + " section jump scroll", icon: ICON.jump,
        run: function () { document.getElementById(s[0]).scrollIntoView({ behavior: "smooth" }); } });
    });
    if (document.getElementById("cbLauncher")) {
      c.push({ title: "Ask the AI assistant", keywords: "chat ai ask question resume llm webllm", icon: ICON.chat,
        run: function () { var l = document.getElementById("cbLauncher"); if (!document.getElementById("cbPanel") || document.getElementById("cbPanel").hidden) l.click(); } });
    }
    var resume = document.querySelector('a[href$="Resume.pdf"]');
    if (resume) c.push({ title: "Download résumé (PDF)", keywords: "resume cv pdf download curriculum", icon: ICON.doc, run: function () { resume.click(); } });
    if (window.PL_injectChaos) {
      c.push({ title: "Inject chaos into the pipeline", keywords: "chaos backpressure poison pill failure resilience break", icon: ICON.bolt,
        run: function () { var h = document.getElementById("hero"); if (h) h.scrollIntoView({ behavior: "smooth" }); window.PL_injectChaos(); } });
    }
    if (document.getElementById("themeToggle")) {
      c.push({ title: "Toggle dark / light theme", keywords: "theme dark light mode appearance", icon: ICON.theme, run: function () { document.getElementById("themeToggle").click(); } });
    }
    c.push({ title: "How this site works", keywords: "colophon tech stack source webllm rag webgl shader architecture", icon: ICON.doc, run: showColophon });
    c.push({ title: "Open GitHub", keywords: "github code repositories source", icon: ICON.ext, run: function () { window.open("https://github.com/pierce-lonergan", "_blank", "noopener"); } });
    c.push({ title: "Open LinkedIn", keywords: "linkedin connect contact hire", icon: ICON.ext, run: function () { window.open("https://www.linkedin.com/in/pierce-lonergan-84034422a/", "_blank", "noopener"); } });
    return c;
  }

  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function score(q, item) {
    if (!q) return 1;
    var hay = norm(item.title + " " + (item.keywords || ""));
    var title = norm(item.title);
    q = norm(q).trim();
    var words = q.split(/\s+/);
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var idx = hay.indexOf(words[i]);
      if (idx < 0) return 0;
      s += idx === 0 ? 2 : 1;
    }
    if (title.indexOf(q) >= 0) s += 4;
    return s;
  }

  /* --------------------------------------------------------- colophon */
  var colophonEl = null;
  function hideColophon() {
    if (!colophonEl) return;
    colophonEl.classList.remove("on");
    setTimeout(function () { if (colophonEl) colophonEl.hidden = true; }, 180);
  }
  function showColophon() {
    if (!colophonEl) {
      var cap = window.PL_CAP || {};
      colophonEl = document.createElement("div");
      colophonEl.className = "cmdk";
      colophonEl.innerHTML =
        '<div class="cmdk-backdrop" data-close="1"></div>' +
        '<div class="cmdk-box colophon-box" role="dialog" aria-modal="true" aria-label="How this site works">' +
          '<div class="colophon">' +
            "<h3>How this site works</h3>" +
            "<p>Hand-built with vanilla HTML, CSS, and JavaScript. No framework, no build step, no backend, no tracking.</p>" +
            "<ul>" +
              "<li><b>Ask AI</b> runs a language model entirely in your browser (WebLLM on WebGPU), grounded by client-side retrieval: the résumé is embedded with a sentence-transformer via Transformers.js, cosine-searched in plain JavaScript, and the matched sections are shown as chips. Nothing you type leaves your device.</li>" +
              "<li><b>The hero backdrop</b> is a hand-written GLSL simplex-noise shader on a low-resolution canvas, and the name condenses from roughly sixteen thousand canvas particles.</li>" +
              "<li><b>The platform diagram</b> is a force-directed DAG (3d-force-graph / Three.js) with live telemetry and a chaos injection you can fire yourself.</li>" +
              "<li><b>The lakehouse flow</b> is d3-sankey with throughput-weighted ribbons, and <b>the embedding map</b> places résumé chunks by their real cosine geometry.</li>" +
              "<li><b>Adaptive rendering</b>: this device was profiled (" + (cap.webgpu ? "WebGPU" : "no WebGPU") + ", " + (cap.webgl2 ? "WebGL2" : "no WebGL2") + ") and the page runs at its <b>" + (cap.tier || "high") + "</b> render tier. If the GPU context is lost, the hero falls back to its CSS aurora rather than a black canvas.</li>" +
              "<li>Everything honors prefers-reduced-motion, degrades without WebGL or WebGPU, and ships from GitHub Pages as static files.</li>" +
            "</ul>" +
            '<p class="colophon-foot">Read the source on <a href="https://github.com/pierce-lonergan/pierce-lonergan.github.io" target="_blank" rel="noopener">GitHub</a>.</p>' +
          "</div>" +
        "</div>";
      document.body.appendChild(colophonEl);
      colophonEl.addEventListener("click", function (e) { if (e.target.getAttribute("data-close")) hideColophon(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideColophon(); });
    }
    colophonEl.hidden = false;
    requestAnimationFrame(function () { colophonEl.classList.add("on"); });
  }

  var ui = {}, commands = [], filtered = [], sel = 0, open = false;

  function build() {
    var root = document.createElement("div");
    root.className = "cmdk";
    root.id = "cmdk";
    root.hidden = true;
    root.innerHTML =
      '<div class="cmdk-backdrop" data-close="1"></div>' +
      '<div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Command palette">' +
        '<div class="cmdk-search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
          '<input id="cmdkInput" type="text" placeholder="Type a command or search..." autocomplete="off" aria-label="Command palette search" />' +
          '<kbd>esc</kbd>' +
        '</div>' +
        '<ul class="cmdk-list" id="cmdkList" role="listbox"></ul>' +
        '<div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> select</span><span>Pierce Lonergan</span></div>' +
      '</div>';
    document.body.appendChild(root);
    ui.root = root;
    ui.input = root.querySelector("#cmdkInput");
    ui.list = root.querySelector("#cmdkList");
    root.addEventListener("click", function (e) { if (e.target.getAttribute("data-close")) close(); });
    ui.input.addEventListener("input", function () { render(ui.input.value); });
    ui.input.addEventListener("keydown", onKeydown);
  }

  function render(q) {
    filtered = commands.map(function (c) { return { c: c, s: score(q, c) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (x) { return x.c; });
    sel = 0;
    ui.list.innerHTML = filtered.length
      ? filtered.map(function (c, i) {
          return '<li class="cmdk-item' + (i === sel ? " sel" : "") + '" role="option" data-i="' + i + '" style="--pi:' + Math.min(i, 12) + '">' +
            '<span class="cmdk-ico">' + svg(c.icon) + '</span>' + escapeHtml(c.title) + '</li>';
        }).join("")
      : '<li class="cmdk-empty">No matches</li>';
    Array.prototype.forEach.call(ui.list.querySelectorAll(".cmdk-item"), function (el) {
      el.addEventListener("mousemove", function () { setSel(+el.getAttribute("data-i")); });
      el.addEventListener("click", function () { exec(+el.getAttribute("data-i")); });
    });
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function setSel(i) {
    sel = i;
    var items = ui.list.querySelectorAll(".cmdk-item");
    Array.prototype.forEach.call(items, function (el, n) { el.classList.toggle("sel", n === sel); });
    if (items[sel]) items[sel].scrollIntoView({ block: "nearest" });
  }

  function exec(i) {
    var cmd = filtered[i];
    if (!cmd) return;
    close();
    setTimeout(cmd.run, 60);
  }

  function onKeydown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(sel + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(sel - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); exec(sel); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  function show() {
    if (open) return;
    open = true;
    commands = buildCommands();
    ui.root.hidden = false;
    render("");
    ui.root.classList.add("fresh");
    setTimeout(function () { ui.root.classList.remove("fresh"); }, 450);
    requestAnimationFrame(function () { ui.root.classList.add("on"); });
    ui.input.value = "";
    setTimeout(function () { ui.input.focus(); }, 40);
  }
  function close() {
    if (!open) return;
    open = false;
    ui.root.classList.remove("on");
    setTimeout(function () { if (!open) ui.root.hidden = true; }, 180);
  }
  function toggle() { open ? close() : show(); }

  function init() {
    build();
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); toggle(); }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".js-palette"), function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); show(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".js-colophon"), function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); showColophon(); });
    });
    if (!/Mac|iP(hone|ad)/.test(navigator.platform || "")) {
      var k = document.querySelector(".cmdk-trigger-k");
      if (k) k.textContent = "Ctrl K";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
