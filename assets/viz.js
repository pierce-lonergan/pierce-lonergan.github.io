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
  var FG_SRC = "https://cdn.jsdelivr.net/npm/3d-force-graph@1.80.0/dist/3d-force-graph.min.js";
  var FG_SRI = "sha384-Y7bC2PBKu8ujxtvo5+Z61OeGdSVRzFsYWBK4i5dnL/U6aFDTodk61qOUkTfInaxS";

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
      s.crossOrigin = "anonymous";
      s.integrity = FG_SRI;
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

  // Always-visible node labels: project graph coordinates to screen space each
  // frame and position DOM elements. Crisp theme-native text, no extra 3D deps.
  function labelOverlay(graph, panel, pick) {
    var wrap = document.createElement("div");
    wrap.className = "viz-labels";
    panel.appendChild(wrap);
    var els = {};
    function frame() {
      requestAnimationFrame(frame);
      if (document.hidden || !graph.graph2ScreenCoords) return;
      var nodes;
      try { nodes = pick() || []; } catch (e) { return; }
      var seen = {};
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.x == null) continue;
        seen[n.id] = 1;
        var el = els[n.id];
        if (!el) {
          el = els[n.id] = document.createElement("span");
          el.className = "viz-label";
          el.textContent = n.name;
          wrap.appendChild(el);
        }
        el.style.display = "";
        var c = graph.graph2ScreenCoords(n.x, n.y, n.z || 0);
        el.style.transform = "translate(-50%,-50%) translate(" + (c.x + (n.labelDx || 0)).toFixed(1) + "px," + (c.y + (n.labelDy != null ? n.labelDy : 20)).toFixed(1) + "px)";
      }
      for (var k in els) { if (!seen[k]) els[k].style.display = "none"; }
    }
    requestAnimationFrame(frame);
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
      .nodeColor(function (n) { return n.booted === false ? "#8a7a68" : (n.degraded ? "#e04545" : n.color); })
      .nodeVal(function (n) { return n.booted === false ? 0.7 : (n.val || 1); })
      .linkDirectionalParticleSpeed(function (l) { return degraded(l) ? 0.0028 : 0.013; })
      .linkDirectionalParticleColor(function (l) { var s = l.source; return (s && s.degraded) ? "#ff8a8a" : ((s && s.color) || "#f0b58a"); })
      .graphData(data);
    graph.onEngineStop(function () { try { graph.zoomToFit(700, 18); } catch (e) {} });
    wireVisibility(graph, canvas, "sway");
    panel.classList.add("viz-live");
    // Portrait layout: labels sit beside the vertical spine instead of under nodes.
    if (!wide) data.nodes.forEach(function (n) { n.labelDx = 52; n.labelDy = 0; });
    labelOverlay(graph, panel, function () { return data.nodes; });

    // Boot sequence: stages come online in flow order the first time the panel is seen.
    if (!prefersReduced && "IntersectionObserver" in window) {
      data.nodes.forEach(function (n) { n.booted = false; });
      graph.linkDirectionalParticles(0);
      var bootOrder = ["src", "schema", "kafka", "spark", "iceberg", "snow", "ml"], bi = 0, bootStarted = false;
      var reapply = function () {
        graph.nodeColor(function (n) { return n.booted === false ? "#8a7a68" : (n.degraded ? "#e04545" : n.color); });
        graph.nodeVal(function (n) { return n.booted === false ? 0.7 : (n.val || 1); });
      };
      var bootIO = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting || bootStarted) return;
          bootStarted = true;
          bootIO.disconnect();
          var t = setInterval(function () {
            var id = bootOrder[bi++];
            data.nodes.forEach(function (n) { if (n.id === id) n.booted = true; });
            reapply();
            if (bi >= bootOrder.length) {
              clearInterval(t);
              graph.linkDirectionalParticles(4);
              try { data.links.forEach(function (l) { graph.emitParticle(l); }); } catch (e) {}
            }
          }, 220);
        });
      }, { threshold: 0.25 });
      bootIO.observe(panel);
    }

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

    // A small live sparkline under the throughput number.
    var spark = null, sctx = null, hist = [];
    if (vtThr && vtThr.parentNode) {
      spark = document.createElement("canvas");
      spark.className = "vt-spark";
      var sdpr = Math.min(window.devicePixelRatio || 1, 2);
      spark.width = Math.round(84 * sdpr); spark.height = Math.round(22 * sdpr);
      vtThr.parentNode.appendChild(spark);
      sctx = spark.getContext("2d");
      if (sctx) sctx.scale(sdpr, sdpr);
    }
    function drawSpark(v, bad) {
      if (!sctx) return;
      hist.push(v);
      if (hist.length > 42) hist.shift();
      sctx.clearRect(0, 0, 84, 22);
      sctx.beginPath();
      for (var i = 0; i < hist.length; i++) {
        var x = (i / 41) * 84, y = 21 - Math.min(1, hist[i] / 14000) * 19;
        if (i) sctx.lineTo(x, y); else sctx.moveTo(x, y);
      }
      sctx.strokeStyle = bad ? "#e05252" : "#f0a866";
      sctx.lineWidth = 1.6;
      sctx.stroke();
    }

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
      var tv = 12600 * health * j(0.12);
      drawSpark(tv, bad);
      if (vtThr) { vtThr.textContent = fmt(tv); vtThr.classList.toggle("vt-bad", bad); }
      if (vtLag) { vtLag.textContent = Math.round((health > 0.85 ? 38 : 38 / h) * j(0.2)) + " ms"; vtLag.classList.toggle("vt-bad", bad); }
      if (vtP99) { vtP99.textContent = Math.round((health > 0.85 ? 172 : 172 / h) * j(0.15)) + " ms"; vtP99.classList.toggle("vt-bad", bad); }
    }
    tick();
    setInterval(tick, 820);

    function chaos() {
      if (chaosActive) return;
      if (data.nodes.some(function (n) { return n.booted === false; })) return; // let the boot finish first
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

    // Pulse a stage by id (the trace waterfall calls this to sync the DAG): particle burst on its outgoing edges.
    window.PL_pipelinePulse = function (id) {
      try { data.links.forEach(function (l) { var s = (l.source && l.source.id !== undefined) ? l.source.id : l.source; if (s === id) graph.emitParticle(l); }); } catch (e) {}
    };

    // Click a stage to see what it does, with a little particle burst on its edges.
    try {
      graph.onNodeClick(function (n) {
        if (!n || n.booted === false || chaosActive) return;
        status(n.label || n.name, "");
        try {
          data.links.forEach(function (l) {
            var s = l.source && l.source.id !== undefined ? l.source.id : l.source;
            var t = l.target && l.target.id !== undefined ? l.target.id : l.target;
            if (s === n.id || t === n.id) graph.emitParticle(l);
          });
        } catch (e) {}
        clearTimeout(window.__plNodeStatus);
        window.__plNodeStatus = setTimeout(function () { if (!chaosActive) status(""); }, 2800);
      });
    } catch (e) {}
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
    var cdata = constellationData();
    graph
      .linkColor(function () { return "rgba(150,124,98,0.32)"; })
      .graphData(cdata);
    var hubs = cdata.nodes.filter(function (n) { return n.hub || n.core; });
    // Labels for the domain hubs, plus any skill node currently flared from the cards below.
    labelOverlay(graph, panel, function () {
      return hubs.concat(cdata.nodes.filter(function (n) { return n.hot && !n.hub && !n.core; }));
    });
    function ink() { return getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#241a12"; }
    function reapply() {
      var hc = ink();
      graph.nodeColor(function (n) { return n.hot ? hc : (n.color || "#e07a5c"); });
      graph.nodeVal(function (n) { return n.hot ? (n.val || 1) * 4 : (n.val || 1); });
    }
    try {
      graph.d3Force("charge").strength(-95);
      graph.d3Force("link").distance(function (l) { return (l.source && l.source.core) ? 70 : 26; });
    } catch (e) {}
    graph.onEngineStop(function () { try { graph.zoomToFit(700, 40); } catch (e) {} });
    wireVisibility(graph, canvas, true, 0.0011);
    panel.classList.add("viz-live");

    // Cross-link: hovering a skill chip in the cards flares its node in the constellation.
    var leaves = cdata.nodes.filter(function (n) { return !n.hub && !n.core; });
    Array.prototype.forEach.call(document.querySelectorAll("#skills .chips li"), function (li) {
      var t = (li.textContent || "").toLowerCase();
      var match = null;
      for (var i = 0; i < leaves.length; i++) {
        var k = leaves[i].name.toLowerCase();
        if (t.indexOf(k) >= 0 || k.indexOf(t) >= 0) { match = leaves[i]; break; }
      }
      if (!match) return;
      li.addEventListener("pointerenter", function () { match.hot = true; reapply(); });
      li.addEventListener("pointerleave", function () { match.hot = false; reapply(); });
    });
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
