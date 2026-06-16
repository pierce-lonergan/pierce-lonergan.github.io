/* =========================================================================
   Pierce Lonergan - data-platform Sankey
   A magnitude-weighted flow of the lakehouse: width tracks throughput as data
   branches from sources through Kafka and Spark into the Bronze/Silver/Gold
   medallion layers, then fans out to the warehouse, ML, reverse ETL, and BI.
   Gradient-filled ribbons (source-to-target) keep it flowing, not blocky.
   D3 + d3-sankey, loaded from CDN on view. Degrades silently.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var host = document.getElementById("sankey");
  if (!host) return;

  function load(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function ensure() {
    if (window.d3 && window.d3.sankey) return Promise.resolve();
    return load("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js")
      .then(function () { return load("https://cdn.jsdelivr.net/npm/d3-sankey@0.12/dist/d3-sankey.min.js"); });
  }

  var NODES = ["API events", "CDC streams", "File drops", "Kafka", "Spark", "Bronze", "Silver", "Gold", "Snowflake", "ML features", "Reverse ETL", "Dashboards", "Filtered / DLQ"];
  var COLORS = ["#f0a866", "#ef9a73", "#e09a62", "#5fb0a8", "#e07a5c", "#c98a5c", "#bcae93", "#f0b429", "#d56f7a", "#b07e9e", "#8a9a8a", "#e8956a", "#9a7d74"];
  // Throughput conserves at every stage (inflow === outflow). Records shed by
  // validation, dedup, and filtering are routed honestly to a dead-letter sink.
  var LINKS = [
    [0, 3, 40], [1, 3, 26],                   // sources -> Kafka (in 66 / out 66)
    [2, 4, 16],                               // files -> Spark
    [3, 4, 52], [3, 5, 14],                   // Kafka 66 -> Spark 52 + Bronze 14
    [4, 5, 62], [4, 12, 6],                   // Spark 68 -> Bronze 62 + 6 malformed -> DLQ
    [5, 6, 70], [5, 12, 6],                   // Bronze 76 -> Silver 70 + 6 deduped/filtered -> DLQ
    [6, 7, 48], [6, 9, 20], [6, 12, 2],       // Silver 70 -> Gold 48 + ML features 20 + 2 -> DLQ
    [7, 8, 24], [7, 10, 10], [7, 11, 14]      // Gold 48 -> Snowflake 24 + Reverse ETL 10 + Dashboards 14
  ];

  var built = false, entranceDone = false;
  function build() {
    var d3 = window.d3;
    try {
      var W = Math.max(360, host.clientWidth), H = Math.max(320, host.clientHeight || 440);
      var nodes = NODES.map(function (n, i) { return { name: n, c: COLORS[i] }; });
      var links = LINKS.map(function (l) { return { source: l[0], target: l[1], value: l[2] }; });
      var sankey = d3.sankey().nodeWidth(11).nodePadding(24).extent([[4, 14], [W - 4, H - 14]]);
      var g = sankey({ nodes: nodes, links: links });

      host.innerHTML = "";
      var svg = d3.select(host).append("svg")
        .attr("width", "100%").attr("height", H)
        .attr("viewBox", "0 0 " + W + " " + H)
        .attr("preserveAspectRatio", "xMidYMid meet");

      // Per-link source-to-target gradient so ribbons flow rather than block.
      var defs = svg.append("defs");
      g.links.forEach(function (d, i) {
        var gr = defs.append("linearGradient").attr("id", "plg" + i).attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", d.source.x1).attr("x2", d.target.x0);
        gr.append("stop").attr("offset", "5%").attr("stop-color", d.source.c);
        gr.append("stop").attr("offset", "95%").attr("stop-color", d.target.c);
      });

      var link = svg.append("g").attr("fill", "none").selectAll("path").data(g.links).join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", function (d, i) { return "url(#plg" + i + ")"; })
        .attr("stroke-opacity", 0.38)
        .attr("stroke-width", function (d) { return Math.max(1, d.width); });
      link.append("title").text(function (d) { return d.source.name + "  to  " + d.target.name + " : " + d.value; });

      // A second pass of dashed strokes streams along every ribbon (CSS animates the offset).
      var flow = svg.append("g").attr("fill", "none").attr("pointer-events", "none")
        .selectAll("path").data(g.links).join("path")
        .attr("class", "sk-flow")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.16)
        .attr("stroke-width", function (d) { return Math.max(1, d.width); })
        .attr("stroke-dasharray", "5 18");

      var node = svg.append("g").selectAll("rect").data(g.nodes).join("rect")
        .attr("x", function (d) { return d.x0; }).attr("y", function (d) { return d.y0; })
        .attr("width", function (d) { return Math.max(2, d.x1 - d.x0); })
        .attr("height", function (d) { return Math.max(2, d.y1 - d.y0); })
        .attr("rx", 2).attr("fill", function (d) { return d.c; });
      node.append("title").text(function (d) { return d.name; });

      // Hovering a node spotlights its flows and dims the rest.
      node.on("pointerenter", function (e, d) {
        link.attr("stroke-opacity", function (l) { return l.source === d || l.target === d ? 0.72 : 0.07; });
        flow.attr("stroke-opacity", function (l) { return l.source === d || l.target === d ? 0.3 : 0.04; });
      }).on("pointerleave", function () {
        link.attr("stroke-opacity", 0.38);
        flow.attr("stroke-opacity", 0.16);
      });

      var labelSel = svg.append("g").attr("class", "sankey-labels").selectAll("text").data(g.nodes).join("text")
        .attr("x", function (d) { return d.x0 < W / 2 ? d.x1 + 8 : d.x0 - 8; })
        .attr("y", function (d) { return (d.y0 + d.y1) / 2; })
        .attr("dy", "0.34em")
        .attr("text-anchor", function (d) { return d.x0 < W / 2 ? "start" : "end"; })
        .text(function (d) { return d.name; });

      if (!prefersReduced && !entranceDone) {
        // Entrance: ribbons grow left-to-right in column order, then the stream fades in.
        entranceDone = true;
        flow.attr("stroke-opacity", 0);
        link.each(function (d, i) {
          var L = this.getTotalLength();
          d3.select(this)
            .attr("stroke-dasharray", L + " " + L)
            .attr("stroke-dashoffset", L)
            .transition()
            .delay(d.source.depth * 180 + i * 30)
            .duration(720)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0)
            .on("end", function () { d3.select(this).attr("stroke-dasharray", null).attr("stroke-dashoffset", null); });
        });
        node.attr("opacity", 0).transition().delay(function (d) { return d.depth * 180; }).duration(500).attr("opacity", 1);
        labelSel.attr("opacity", 0).transition().delay(function (d) { return 240 + d.depth * 180; }).duration(500).attr("opacity", 1);
        setTimeout(function () { flow.transition().duration(600).attr("stroke-opacity", 0.16); }, 1900);
      }
      built = true;
    } catch (e) { host.classList.add("sankey-failed"); }
  }

  function init() {
    var section = document.getElementById("dataflow") || host;
    function go() { ensure().then(build).catch(function () { host.classList.add("sankey-failed"); }); }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { go(); io.disconnect(); } }); }, { rootMargin: "150px" });
      io.observe(section);
    } else { go(); }
    var rt; window.addEventListener("resize", function () { if (!built) return; clearTimeout(rt); rt = setTimeout(build, 250); }, { passive: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
