/* =========================================================================
   Pierce Lonergan - recruiter "fit check"
   Paste a job description; it is embedded against the résumé knowledge base
   entirely in the browser (Transformers.js, same model as the assistant) and
   scored requirement-by-requirement with cosine similarity. Evidence, not a
   verdict, with gaps shown honestly, and each row brushes the embedding map.
   No LLM and no WebGPU required; nothing typed leaves the device.
   ========================================================================= */
(function () {
  "use strict";
  var form = document.getElementById("fitForm");
  if (!form) return;
  var jd = document.getElementById("fitJD");
  var statusEl = document.getElementById("fitStatus");
  var resultsEl = document.getElementById("fitResults");
  var sampleBtn = document.getElementById("fitSample");
  var KB = window.PL_KB || [];
  var EMBED_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
  var EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";

  var embedder = null, embedderPromise = null, kbVecs = null, busy = false;

  function ensureEmbedder() {
    if (embedder) return Promise.resolve(embedder);
    if (embedderPromise) return embedderPromise;
    embedderPromise = import(EMBED_CDN)
      .then(function (mod) { return mod.pipeline("feature-extraction", EMBED_MODEL); })
      .then(function (ex) { embedder = ex; return ex; });
    return embedderPromise;
  }
  function embed(ex, text) { return ex(text, { pooling: "mean", normalize: true }).then(function (o) { return Array.prototype.slice.call(o.data); }); }
  function cosine(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function ensureKbVecs(ex) {
    if (kbVecs) return Promise.resolve(kbVecs);
    var vecs = [], p = Promise.resolve();
    KB.forEach(function (it, i) { p = p.then(function () { return embed(ex, it.text).then(function (v) { vecs[i] = v; }); }); });
    return p.then(function () { kbVecs = vecs; return vecs; });
  }

  // Pull plausible "requirements" out of pasted text without lookbehind regex.
  function requirements(text) {
    var norm = String(text).replace(/([.;!?])\s+/g, "$1\n").replace(/[•·‣•]/g, "\n");
    var seen = {}, out = [];
    norm.split(/\n+/).forEach(function (line) {
      var s = line.replace(/^[\s\-*•·•\d.)\]]+/, "").trim();
      var words = s.split(/\s+/).filter(Boolean);
      if (words.length < 4 || s.length < 18) return;
      var key = s.toLowerCase().slice(0, 60);
      if (seen[key]) return; seen[key] = 1;
      out.push(s.length > 170 ? s.slice(0, 167) + "…" : s);
    });
    return out.slice(0, 12);
  }

  function classify(score) { return score >= 0.42 ? "strong" : score >= 0.30 ? "partial" : "gap"; }

  function analyze(text) {
    if (busy) return;
    var reqs = requirements(text);
    if (!reqs.length) { statusEl.textContent = "Paste a few full-sentence requirements and try again."; return; }
    busy = true;
    statusEl.textContent = "Embedding " + reqs.length + " requirements on-device…";
    resultsEl.innerHTML = "";
    ensureEmbedder().then(function (ex) {
      return ensureKbVecs(ex).then(function (vecs) {
        var p = Promise.resolve(), scored = [];
        reqs.forEach(function (r, i) {
          p = p.then(function () {
            return embed(ex, r).then(function (qv) {
              var best = -1, bestI = -1;
              for (var k = 0; k < vecs.length; k++) { var c = cosine(qv, vecs[k]); if (c > best) { best = c; bestI = k; } }
              scored[i] = { req: r, score: best, chunk: KB[bestI] };
            });
          });
        });
        return p.then(function () { render(scored); });
      });
    }).catch(function () {
      statusEl.textContent = "The on-device model couldn't load here, but my résumé, projects, and skills above cover the same ground.";
    }).then(function () { busy = false; });
  }

  function render(scored) {
    var strong = 0, partial = 0, gap = 0;
    scored.forEach(function (x) { var c = classify(x.score); if (c === "strong") strong++; else if (c === "partial") partial++; else gap++; });
    statusEl.textContent = "";
    var rows = scored.map(function (x) {
      var cls = classify(x.score);
      var label = cls === "strong" ? "Strong" : cls === "partial" ? "Partial" : "Gap";
      var ev = cls === "gap" ? "no strong match in résumé" : ((x.chunk ? x.chunk.topic : "") + " · " + Math.round(x.score * 100) + "%");
      return '<li class="fit-row fit-' + cls + '" data-topic="' + esc((x.chunk && x.chunk.topic) || "") + '">' +
        '<span class="fit-badge">' + label + '</span>' +
        '<span class="fit-req">' + esc(x.req) + '</span>' +
        '<span class="fit-ev">' + esc(ev) + '</span>' +
        '</li>';
    }).join("");
    resultsEl.innerHTML =
      '<p class="fit-summary"><b>' + strong + '</b> strong · <b>' + partial + '</b> partial · <b>' + gap + '</b> gap, across ' + scored.length + ' requirements. ' +
      '<span class="fit-disc">Cosine similarity over my résumé. Evidence, not a verdict. Hover a row to find it on the map above.</span></p>' +
      '<ul class="fit-list">' + rows + '</ul>';
    Array.prototype.forEach.call(resultsEl.querySelectorAll(".fit-row"), function (li) {
      li.addEventListener("mouseenter", function () {
        var t = li.getAttribute("data-topic");
        if (t && window.PL_galaxyHighlight) { try { window.PL_galaxyHighlight([t]); } catch (e) {} }
      });
    });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); analyze(jd.value || ""); });
  if (sampleBtn) sampleBtn.addEventListener("click", function () {
    jd.value = "We're hiring a Senior Data Engineer to build and operate high-throughput streaming pipelines on Apache Kafka and Spark.\n" +
      "Design and maintain a lakehouse on Apache Iceberg and Snowflake with strong data modeling.\n" +
      "Deep experience with schema evolution, exactly-once processing, and change data capture.\n" +
      "Build reusable, production-grade platform components and raise developer velocity.\n" +
      "Familiarity with applied ML and retrieval (RAG, embeddings, reranking) is a strong plus.\n" +
      "Strong Python and Java; comfortable operating on AWS.\n" +
      "Experience managing Kubernetes clusters and Terraform infrastructure-as-code.";
    analyze(jd.value);
  });
})();
