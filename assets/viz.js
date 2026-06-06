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
      .nodeColor(function (n) { return n.color || "#818cf8"; })
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
      if (visible && autorotate && scene) scene.rotation.y += rate;
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
    var C = { src: "#38bdf8", kafka: "#22d3ee", spark: "#818cf8", schema: "#fbbf24", ice: "#34d399", snow: "#60a5fa", ml: "#c084fc" };
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
    var graph = makeGraph(FG, canvas, { interactive: false, particles: 3, particleSpeed: 0.012, particleWidth: 2.6, nodeRelSize: 5 });
    graph
      .dagMode("td")
      .dagLevelDistance(34)
      .nodeColor(function (n) { return n.degraded ? "#ff5a5a" : n.color; })
      .linkColor(function (l) { return degraded(l) ? "rgba(255,90,90,0.55)" : "rgba(148,163,184,0.26)"; })
      .linkDirectionalParticleSpeed(function (l) { return degraded(l) ? 0.0028 : 0.012; })
      .linkDirectionalParticleColor(function (l) { var s = l.source; return (s && s.degraded) ? "#ff8a8a" : ((s && s.color) || "#a5b4fc"); })
      .graphData(data);
    graph.onEngineStop(function () { try { graph.zoomToFit(700, 26); } catch (e) {} });
    wireVisibility(graph, canvas, true, 0.0018);
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
      graph.nodeColor(function (n) { return n.degraded ? "#ff5a5a" : n.color; });
      graph.linkColor(function (l) { return degraded(l) ? "rgba(255,90,90,0.55)" : "rgba(148,163,184,0.26)"; });
      graph.linkDirectionalParticleSpeed(function (l) { return degraded(l) ? 0.0028 : 0.012; });
      graph.linkDirectionalParticleColor(function (l) { var s = l.source; return (s && s.degraded) ? "#ff8a8a" : ((s && s.color) || "#a5b4fc"); });
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
      if (vtThr) vtThr.textContent = fmt(12600 * health * j(0.12));
      if (vtLag) vtLag.textContent = Math.round((health > 0.85 ? 38 : 38 / h) * j(0.2)) + " ms";
      if (vtP99) vtP99.textContent = Math.round((health > 0.85 ? 172 : 172 / h) * j(0.15)) + " ms";
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
      status("Backpressure on " + target.name + ". Consumer lag climbing.", "warn");
      setTimeout(function () { status("Draining the backlog. Recovering.", "warn"); health = 0.5; }, 2300);
      setTimeout(function () {
        target.degraded = false; restyle();
        health = 1; panel.classList.remove("viz-alert");
        status("Pipeline healthy. Exactly-once preserved.", "ok");
        setTimeout(function () { status(""); chaosActive = false; }, 2400);
      }, 4800);
    }
    if (chaosBtn) chaosBtn.addEventListener("click", chaos);
    window.PL_injectChaos = chaos;
  }

  /* ------------------------------------------ Skills: force-directed graph */
  function constellationData() {
    var domains = [
      { id: "streaming", name: "Streaming", color: "#22d3ee", skills: ["Kafka", "Spark", "Structured Streaming", "Project Reactor", "Cassandra", "Avro", "Schema evolution", "CDC", "Exactly-once"] },
      { id: "lakehouse", name: "Lakehouse", color: "#34d399", skills: ["Iceberg", "Snowflake", "Parquet", "Partitioning", "Data modeling", "Incremental sync"] },
      { id: "cloud", name: "Cloud", color: "#38bdf8", skills: ["S3", "EMR", "MSK", "Glue", "Kinesis", "Lambda", "Docker", "CI/CD", "Hexagonal arch"] },
      { id: "ml", name: "ML & Retrieval", color: "#c084fc", skills: ["RAG", "Hybrid retrieval", "ColBERT", "Cross-encoder", "Embeddings (BGE)", "Qdrant", "LLM apps", "INT8"] },
      { id: "gov", name: "Governance", color: "#fbbf24", skills: ["Canonical catalogs", "Semantic schema matching", "Entity resolution", "Lineage", "Data quality"] },
      { id: "lang", name: "Languages", color: "#fb7185", skills: ["Python", "Java", "Scala", "Groovy", "Bash", "SQL"] }
    ];
    var nodes = [{ id: "core", name: "Stack", label: "The stack", color: "#e8eef9", val: 14, core: true }];
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
    var graph = makeGraph(FG, canvas, { interactive: true, particles: 0, nodeRelSize: 4, linkWidth: 0.7 });
    graph
      .linkColor(function () { return "rgba(148,163,184,0.16)"; })
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
