/* =========================================================================
   Pierce Lonergan - 3D visualizations
   Hero data-flow pipeline (animated DAG) + skills constellation, rendered
   with 3d-force-graph (Three.js / WebGL), loaded from a CDN on demand.

   Degrades gracefully: when WebGL is unavailable, reduced motion is set,
   the CDN fails, or the screen is small, the static fallbacks in the markup
   stay in place and nothing here ever throws into the page.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FG_SRC = "https://cdn.jsdelivr.net/npm/3d-force-graph@1/dist/3d-force-graph.min.js";

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  var libPromise = null;
  function ensureLib() {
    if (window.ForceGraph3D) return Promise.resolve(window.ForceGraph3D);
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = FG_SRC;
      s.async = true;
      s.onload = function () { window.ForceGraph3D ? resolve(window.ForceGraph3D) : reject(new Error("ForceGraph3D missing")); };
      s.onerror = function () { reject(new Error("failed to load 3d-force-graph")); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  // Shared setup for a graph instance bound to a `.viz-canvas` element.
  function makeGraph(FG, canvas, opts) {
    var graph = FG()(canvas)
      .backgroundColor("rgba(0,0,0,0)")
      .showNavInfo(false)
      .nodeRelSize(opts.nodeRelSize || 5)
      .nodeOpacity(0.92)
      .linkColor(function () { return "rgba(148,163,184,0.26)"; })
      .linkWidth(opts.linkWidth != null ? opts.linkWidth : 1)
      .linkDirectionalParticles(opts.particles != null ? opts.particles : 0)
      .linkDirectionalParticleWidth(opts.particleWidth || 2.2)
      .linkDirectionalParticleSpeed(opts.particleSpeed || 0.01)
      .nodeColor(function (n) { return n.color || "#e07a5c"; })
      .nodeVal(function (n) { return n.val || 1; })
      .nodeLabel(function (n) { return n.label || n.name || ""; });

    function size() {
      var w = canvas.clientWidth || canvas.offsetWidth;
      var h = canvas.clientHeight || canvas.offsetHeight;
      if (w && h) graph.width(w).height(h);
    }
    size();
    window.addEventListener("resize", debounce(size, 200), { passive: true });

    // Cap pixel ratio so high-DPI screens stay smooth.
    try {
      var r = graph.renderer();
      if (r && r.setPixelRatio) r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    } catch (e) {}

    // Never let the canvas hijack page scrolling.
    try {
      var ctrl = graph.controls();
      if (ctrl) {
        ctrl.noZoom = true;
        if (opts.interactive === false) ctrl.enabled = false;
      }
    } catch (e) {}

    if (opts.interactive === false) graph.enableNodeDrag(false);

    return graph;
  }

  // Pause rendering offscreen; gently auto-rotate while visible.
  function wireVisibility(graph, canvas, autorotate, speed) {
    var visible = false, rafId = null, scene = null;
    try { scene = graph.scene(); } catch (e) {}
    var rate = speed || 0.0016;

    function tick() {
      if (visible && autorotate && scene) {
        // "sway" oscillates gently (right for directional layouts); anything else spins.
        if (autorotate === "sway") scene.rotation.y = Math.sin(performance.now() * 0.00022) * 0.16;
        else scene.rotation.y += rate;
      }
      rafId = requestAnimationFrame(tick);
    }
    function start() { if (rafId == null) tick(); }
    function stop() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible) { try { graph.resumeAnimation(); } catch (e) {} start(); }
          else { try { graph.pauseAnimation(); } catch (e) {} stop(); }
        });
      }, { threshold: 0.05 });
      io.observe(canvas);
    } else {
      visible = true;
      try { graph.resumeAnimation(); } catch (e) {}
      start();
    }
  }

  /* ----------------------------------------------- Hero: data-flow pipeline */
  function pipelineData() {
    var C = { src: "#f0a866", kafka: "#5fb0a8", spark: "#e07a5c", schema: "#fbbf24", ice: "#34d399", snow: "#cc9a80", ml: "#d56f7a" };
    var nodes = [
      { id: "src",     name: "Sources",         label: "Sources: APIs, CDC, files",                         color: C.src,    val: 6 },
      { id: "kafka",   name: "Kafka",            label: "Kafka: streaming backbone",                         color: C.kafka,  val: 9 },
      { id: "schema",  name: "Schema Registry",  label: "Schema registry: Avro, forward-compatible evolution", color: C.schema, val: 5 },
      { id: "spark",   name: "Spark",            label: "Spark: Structured Streaming + ETL",                 color: C.spark,  val: 11 },
      { id: "iceberg", name: "Iceberg",          label: "Apache Iceberg: lakehouse tables",                  color: C.ice,    val: 7 },
      { id: "snow",    name: "Snowflake",        label: "Snowflake: warehouse",                              color: C.snow,   val: 7 },
      { id: "ml",      name: "ML / Serving",     label: "ML / serving: features and models",                 color: C.ml,     val: 8 }
    ];
    var links = [
      { source: "src", target: "kafka" },
      { source: "kafka", target: "spark" },
      { source: "schema", target: "spark" },
      { source: "spark", target: "iceberg" },
      { source: "spark", target: "snow" },
      { source: "iceberg", target: "ml" },
      { source: "snow", target: "ml" }
    ];
    return { nodes: nodes, links: links };
  }

  function degraded(l) { return (l.source && l.source.degraded) || (l.target && l.target.degraded); }

  function initPipeline(FG, panel) {
    var canvas = panel.querySelector(".viz-canvas");
    var data = pipelineData();
    // Wide panels read left-to-right (fills the aspect ratio); narrow ones top-down.
    var wide = (canvas.clientWidth || panel.clientWidth || 0) > 620;
    var graph = makeGraph(FG, canvas, { interactive: false, particles: 4, particleSpeed: 0.013, particleWidth: 3.4, nodeRelSize: 7 });
    graph
      .dagMode(wide ? "lr" : "td")
      .dagLevelDistance(wide ? 56 : 34)
      .linkColor(function (l) { return degraded(l) ? "rgba(224,82,82,0.6)" : "rgba(150,124,98,0.3)"; })
      .nodeColor(function (n) { return n.degraded ? "#e04545" : n.color; })
      .linkDirectionalParticleSpeed(function (l) { return degraded(l) ? 0.0028 : 0.013; })
      .linkDirectionalParticleColor(function (l) { var s = l.source; return (s && s.degraded) ? "#ff8a8a" : ((s && s.color) || "#f0b58a"); })
      .graphData(data);
    graph.onEngineStop(function () { try { graph.zoomToFit(700, 18); } catch (e) {} });
    wireVisibility(graph, canvas, "sway");
    panel.classList.add("viz-live");
    pipelineExtras(panel, graph, data);
    return graph;
  }

  // Live telemetry + chaos injection: turns the diagram into a running platform.
  function pipelineExtras(panel, graph, data) {
    var vtThr = panel.querySelector("#vtThroughput");
    var vtLag = panel.querySelector("#vtLag");
    var vtP99 = panel.querySelector("#vtP99");
    var statusEl = panel.querySelector("#vizStatus");
    var chaosBtn = panel.querySelector(".js-chaos");
    var nodeById = {};
    data.nodes.forEach(function (n) { nodeById[n.id] = n; });

    var health = 1, chaosActive = false;
    function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : Math.round(n) + ""; }

    // Re-applying the accessors with fresh closures forces 3d-force-graph to repaint.
    function restyle() {
      graph.nodeColor(function (n) { return n.degraded ? "#e04545" : n.color; });
      graph.linkColor(function (l) { return degraded(l) ? "rgba(224,82,82,0.6)" : "rgba(150,124,98,0.3)"; });
      graph.linkDirectionalParticleSpeed(function (l) { return degraded(l) ? 0.0028 : 0.013; });
      graph.linkDirectionalParticleColor(function (l) { var s = l.source; return (s && s.degraded) ? "#ff8a8a" : ((s && s.color) || "#f0b58a"); });
    }
    function status(text, kind) {
      if (!statusEl) return;
      statusEl.textContent = text || "";
      statusEl.className = "viz-status" + (kind ? " " + kind : "") + (text ? " show" : "");
    }
    function tick() {
      if (document.hidden) return;
      var j = function (s) { return 1 + (Math.random() - 0.5) * s; };
      var h = Math.max(health, 0.12);
      var bad = health < 0.9;
      if (vtThr) { vtThr.textContent = fmt(12600 * health * j(0.12)); vtThr.classList.toggle("vt-bad", bad); }
      if (vtLag) { vtLag.textContent = Math.round((health > 0.85 ? 38 : 38 / h) * j(0.2)) + " ms"; vtLag.classList.toggle("vt-bad", bad); }
      if (vtP99) { vtP99.textContent = Math.round((health > 0.85 ? 172 : 172 / h) * j(0.15)) + " ms"; vtP99.classList.toggle("vt-bad", bad); }
    }
    tick();
    setInterval(tick, 820);

    function chaos() {
      if (chaosActive) return;
      chaosActive = true;
      var target = nodeById.spark || data.nodes[Math.min(3, data.nodes.length - 1)];
      target.degraded = true; restyle();
      health = 0.16;
      panel.classList.add("viz-alert");
      status("Poison pill hit " + target.name + ". Backpressure building, consumer lag climbing.", "warn");
      setTimeout(function () { status("Dead-lettered the poison pill. Draining the backlog.", "warn"); health = 0.45; }, 4200);
      setTimeout(function () {
        target.degraded = false; restyle();
        health = 1; panel.classList.remove("viz-alert");
        status("Pipeline healthy. Exactly-once preserved.", "ok");
        // a celebratory surge of particles down every edge as it recovers
        try { data.links.forEach(function (l) { graph.emitParticle(l); setTimeout(function () { graph.emitParticle(l); }, 240); }); } catch (e) {}
        setTimeout(function () { status(""); chaosActive = false; }, 3000);
      }, 9000);
    }
    if (chaosBtn) chaosBtn.addEventListener("click", chaos);
    window.PL_injectChaos = chaos;
  }

  /* ------------------------------------------ Skills: force-directed graph */
  function constellationData() {
    var domains = [
      { id: "streaming", name: "Streaming", color: "#5fb0a8", skills: ["Kafka", "Spark", "Structured Streaming", "Project Reactor", "Cassandra", "Avro", "Schema evolution", "CDC", "Exactly-once"] },
      { id: "lakehouse", name: "Lakehouse", color: "#34d399", skills: ["Iceberg", "Snowflake", "Parquet", "Partitioning", "Data modeling", "Incremental sync"] },
      { id: "cloud", name: "Cloud", color: "#f0a866", skills: ["S3", "EMR", "MSK", "Glue", "Kinesis", "Lambda", "Docker", "CI/CD", "Hexagonal arch"] },
      { id: "ml", name: "ML & Retrieval", color: "#d56f7a", skills: ["RAG", "Hybrid retrieval", "ColBERT", "Cross-encoder", "Embeddings (BGE)", "Qdrant", "LLM apps", "INT8"] },
      { id: "gov", name: "Governance", color: "#fbbf24", skills: ["Canonical catalogs", "Semantic schema matching", "Entity resolution", "Lineage", "Data quality"] },
      { id: "lang", name: "Languages", color: "#b07e9e", skills: ["Python", "Java", "Scala", "Groovy", "Bash", "SQL"] }
    ];
    var nodes = [{ id: "core", name: "Stack", label: "The stack", color: "#e07a5c", val: 14, core: true }];
    var links = [];
    domains.forEach(function (d) {
      nodes.push({ id: d.id, name: d.name, label: d.name, color: d.color, val: 9, hub: true });
      links.push({ source: "core", target: d.id });
      d.skills.forEach(function (s, i) {
        var nid = d.id + ":" + i;
        nodes.push({ id: nid, name: s, label: s + " (" + d.name + ")", color: d.color, val: 2.4 });
        links.push({ source: d.id, target: nid });
      });
    });
    return { nodes: nodes, links: links };
  }

  function initConstellation(FG, panel) {
    panel.classList.add("viz-on"); // panel must be laid out before the canvas can be sized
    var canvas = panel.querySelector(".viz-canvas");
    var graph = makeGraph(FG, canvas, { interactive: true, particles: 0, nodeRelSize: 5, linkWidth: 1.1 });
    graph
      .linkColor(function () { return "rgba(150,124,98,0.32)"; })
      .graphData(constellationData());
    try {
      graph.d3Force("charge").strength(-95);
      graph.d3Force("link").distance(function (l) { return (l.source && l.source.core) ? 70 : 26; });
    } catch (e) {}
    graph.onEngineStop(function () { try { graph.zoomToFit(700, 40); } catch (e) {} });
    wireVisibility(graph, canvas, true, 0.0011);
    panel.classList.add("viz-live");
    return graph;
  }

  /* ---------------------------------------------------------- bootstrap */
  function lazyInit(panel, initFn, observeEl) {
    observeEl = observeEl || panel;
    var started = false;
    function go() {
      if (started) return;
      started = true;
      ensureLib().then(function (FG) { initFn(FG, panel); }).catch(function () { /* static fallback stays */ });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { go(); io.disconnect(); } });
      }, { rootMargin: "300px" });
      io.observe(observeEl);
    } else { go(); }
  }

  function run() {
    var heroPanel = document.getElementById("heroViz");
    var skillsPanel = document.getElementById("skillsViz");
    if (!heroPanel && !skillsPanel) return;
    if (prefersReduced || !hasWebGL()) return; // static fallbacks remain in place

    var smallScreen = window.innerWidth < 720;

    if (heroPanel) lazyInit(heroPanel, initPipeline); // pipeline is the centerpiece on every screen
    // Skills panel starts display:none; observe the always-visible section so the
    // lazy trigger can fire, and initConstellation reveals the panel (viz-on) before mounting.
    if (skillsPanel && !smallScreen) {
      lazyInit(skillsPanel, initConstellation, document.getElementById("skills") || skillsPanel);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
