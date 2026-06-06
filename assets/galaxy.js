/* =========================================================================
   Pierce Lonergan - embedding galaxy
   A 3D map of the resume in embedding space. Each chunk is embedded with a
   sentence-transformer (Transformers.js), connected to its nearest neighbours
   by cosine similarity, and laid out with 3d-force-graph so related pieces
   cluster. A query box (and the chat) light up the closest points.

   Lazy-mounts on view, loads everything from CDN, degrades silently where
   WebGL or the model is unavailable.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EMBED_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";
  var EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
  var FG_SRC = "https://cdn.jsdelivr.net/npm/3d-force-graph@1/dist/3d-force-graph.min.js";
  var KB = window.PL_KB || [];

  var CATS = {
    exp: "#38bdf8", skills: "#34d399", projects: "#c084fc", background: "#fbbf24"
  };
  function categoryOf(topic) {
    var t = (topic || "").toLowerCase();
    if (/role|platform|reliability|governance automation|career|earlier/.test(t)) return "exp";
    if (/skill|languages/.test(t)) return "skills";
    if (/nexusmatcher|nexuspiercer|mammal|entropy|series 65/.test(t)) return "projects";
    return "background";
  }

  function hasWebGL() {
    try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); }
    catch (e) { return false; }
  }
  function cosine(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  var fgPromise = null;
  function ensureFG() {
    if (window.ForceGraph3D) return Promise.resolve(window.ForceGraph3D);
    if (fgPromise) return fgPromise;
    fgPromise = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = FG_SRC; s.async = true;
      s.onload = function () { window.ForceGraph3D ? res(window.ForceGraph3D) : rej(); };
      s.onerror = rej; document.head.appendChild(s);
    });
    return fgPromise;
  }
  var embedderPromise = null;
  function ensureEmbedder() {
    if (embedderPromise) return embedderPromise;
    embedderPromise = import(EMBED_CDN).then(function (m) { return m.pipeline("feature-extraction", EMBED_MODEL); });
    return embedderPromise;
  }
  function embed(ex, text) { return ex(text, { pooling: "mean", normalize: true }).then(function (o) { return Array.prototype.slice.call(o.data); }); }

  var graph = null, nodes = [], started = false, panelEl = null;

  function setLoading(txt) { var l = panelEl && panelEl.querySelector(".gx-loading"); if (l) { l.textContent = txt || ""; l.style.display = txt ? "flex" : "none"; } }
  function caption(html) { var c = panelEl && panelEl.parentNode.querySelector(".gx-caption"); if (c) c.innerHTML = html || ""; }

  function restyle() {
    if (!graph) return;
    graph.nodeColor(function (n) { return n.hot ? "#ffffff" : n.color; })
      .nodeVal(function (n) { return n.hot ? 9 : n.val; });
  }

  function highlight(topics) {
    if (!graph || !nodes.length) return;
    var set = {}; (topics || []).forEach(function (t) { set[(t || "").toLowerCase()] = 1; });
    nodes.forEach(function (n) { n.hot = !!set[n.topic.toLowerCase()]; });
    restyle();
  }

  function build(panel) {
    if (started) return; started = true; panelEl = panel;
    var canvas = panel.querySelector(".viz-canvas");
    setLoading("Mapping the résumé into embedding space...");
    Promise.all([ensureFG(), ensureEmbedder()]).then(function (r) {
      var ex = r[1], seq = Promise.resolve();
      KB.forEach(function (item, i) {
        seq = seq.then(function () {
          return embed(ex, item.text).then(function (v) {
            var cat = categoryOf(item.topic);
            nodes.push({ id: i, topic: item.topic, cat: cat, color: CATS[cat], vec: v, val: 3 });
          });
        });
      });
      return seq.then(function () { return r[0]; });
    }).then(function (FG) {
      var links = [];
      for (var i = 0; i < nodes.length; i++) {
        var sims = [];
        for (var j = 0; j < nodes.length; j++) if (i !== j) sims.push({ j: j, s: cosine(nodes[i].vec, nodes[j].vec) });
        sims.sort(function (a, b) { return b.s - a.s; });
        for (var k = 0; k < Math.min(2, sims.length); k++) links.push({ source: i, target: sims[k].j });
      }
      graph = FG()(canvas)
        .backgroundColor("rgba(0,0,0,0)").showNavInfo(false)
        .nodeColor(function (n) { return n.hot ? "#ffffff" : n.color; })
        .nodeVal(function (n) { return n.hot ? 9 : n.val; })
        .nodeOpacity(0.9)
        .nodeLabel(function (n) { return n.topic; })
        .linkColor(function () { return "rgba(148,163,184,0.14)"; })
        .linkWidth(0.6)
        .graphData({ nodes: nodes, links: links });
      try { graph.d3Force("charge").strength(-65); } catch (e) {}
      setupGraph(canvas);
      graph.onEngineStop(function () { try { graph.zoomToFit(700, 44); } catch (e) {} });
      setLoading("");
      panel.classList.add("viz-live");
      wireVisibility(canvas);
      caption("Each point is a piece of Pierce's résumé, placed by meaning. Type a query to see what it retrieves.");
      window.PL_galaxyHighlight = highlight;
    }).catch(function () { setLoading("The embedding map could not load here."); });
  }

  function setupGraph(canvas) {
    function applySize() {
      if (!graph) return;
      var w = canvas.clientWidth || (panelEl && panelEl.clientWidth) || 600;
      var h = canvas.clientHeight || (panelEl && panelEl.clientHeight) || 480;
      graph.width(w).height(h);
    }
    applySize();
    requestAnimationFrame(applySize);
    // Layout can settle a frame late; re-size and re-frame so points sit inside the panel.
    setTimeout(function () { applySize(); try { graph.zoomToFit(600, 46); } catch (e) {} }, 400);
    window.addEventListener("resize", function () { clearTimeout(window.__gxr); window.__gxr = setTimeout(applySize, 200); }, { passive: true });
    try { var r = graph.renderer(); if (r && r.setPixelRatio) r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); } catch (e) {}
    try { var c = graph.controls(); if (c) c.noZoom = true; } catch (e) {}
  }

  function wireVisibility(canvas) {
    var vis = false, raf = null, scene = null;
    try { scene = graph.scene(); } catch (e) {}
    function tick() { if (vis && scene) scene.rotation.y += 0.0009; raf = requestAnimationFrame(tick); }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          vis = e.isIntersecting;
          if (vis) { try { graph.resumeAnimation(); } catch (x) {} if (raf == null) tick(); }
          else { try { graph.pauseAnimation(); } catch (x) {} if (raf != null) { cancelAnimationFrame(raf); raf = null; } }
        });
      }, { threshold: 0.05 }).observe(canvas);
    } else { vis = true; tick(); }
  }

  function runQuery(q) {
    if (!q || !q.trim()) { nodes.forEach(function (n) { n.hot = false; }); restyle(); caption(""); return; }
    caption("Embedding the query...");
    ensureEmbedder().then(function (ex) { return embed(ex, q); }).then(function (qv) {
      var scored = nodes.map(function (n) { return { n: n, s: cosine(qv, n.vec) }; }).sort(function (a, b) { return b.s - a.s; });
      var top = scored.slice(0, 4), set = {};
      top.forEach(function (x) { set[x.n.id] = 1; });
      nodes.forEach(function (n) { n.hot = !!set[n.id]; });
      restyle();
      caption("Closest matches: " + top.map(function (x) { return "<b>" + esc(x.n.topic) + "</b> " + Math.round(x.s * 100) + "%"; }).join("  ·  "));
    }).catch(function () { caption(""); });
  }

  function init() {
    var panel = document.getElementById("galaxyViz");
    if (!panel || !KB.length) return;
    var form = document.getElementById("gxForm");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); if (started) runQuery((document.getElementById("gxQuery") || {}).value || ""); });
    if (prefersReduced || !hasWebGL()) return; // section keeps its static description only

    var section = document.getElementById("embedding") || panel;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { panel.classList.add("viz-on"); build(panel); io.disconnect(); } });
      }, { rootMargin: "200px" });
      io.observe(section);
    } else { panel.classList.add("viz-on"); build(panel); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
