/* =========================================================================
   Pierce Lonergan - data-platform Sankey
   A magnitude-weighted flow of the lakehouse: width tracks throughput as data
   moves from sources through Kafka and Spark into the Bronze/Silver/Gold
   medallion layers, then out to the warehouse, ML features, and reverse ETL.
   D3 + d3-sankey, loaded from CDN on view. Warm-themed. Degrades silently.
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

  var NODES = ["API events", "CDC streams", "File drops", "Kafka", "Spark", "Bronze", "Silver", "Gold", "Snowflake", "ML features", "Reverse ETL"];
  var COLORS = ["#f0a866", "#f0a866", "#e09a62", "#5fb0a8", "#e07a5c", "#cc9a80", "#e8c06a", "#fbbf24", "#d56f7a", "#b07e9e", "#9a8f7a"];
  var LINKS = [
    [0, 3, 38], [1, 3, 24], [2, 4, 12],
    [3, 4, 62],
    [4, 5, 72],
    [5, 6, 72],
    [6, 7, 60],
    [7, 8, 28], [7, 9, 20], [7, 10, 12]
  ];

  var built = false;
  function build() {
    var d3 = window.d3;
    try {
      var W = Math.max(360, host.clientWidth), H = Math.max(300, host.clientHeight || 420);
      var nodes = NODES.map(function (n, i) { return { name: n, c: COLORS[i] }; });
      var links = LINKS.map(function (l) { return { source: l[0], target: l[1], value: l[2] }; });
      var sankey = d3.sankey().nodeWidth(13).nodePadding(15).extent([[4, 12], [W - 4, H - 12]]);
      var g = sankey({ nodes: nodes, links: links });

      host.innerHTML = "";
      var svg = d3.select(host).append("svg")
        .attr("width", "100%").attr("height", H)
        .attr("viewBox", "0 0 " + W + " " + H)
        .attr("preserveAspectRatio", "xMidYMid meet");

      var link = svg.append("g").attr("fill", "none").selectAll("path").data(g.links).join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", function (d) { return d.source.c; })
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", function (d) { return Math.max(1, d.width); });
      link.append("title").text(function (d) { return d.source.name + "  to  " + d.target.name + " : " + d.value; });

      var node = svg.append("g").selectAll("rect").data(g.nodes).join("rect")
        .attr("x", function (d) { return d.x0; }).attr("y", function (d) { return d.y0; })
        .attr("width", function (d) { return Math.max(2, d.x1 - d.x0); })
        .attr("height", function (d) { return Math.max(2, d.y1 - d.y0); })
        .attr("rx", 2).attr("fill", function (d) { return d.c; });
      node.append("title").text(function (d) { return d.name; });

      svg.append("g").attr("class", "sankey-labels").selectAll("text").data(g.nodes).join("text")
        .attr("x", function (d) { return d.x0 < W / 2 ? d.x1 + 7 : d.x0 - 7; })
        .attr("y", function (d) { return (d.y0 + d.y1) / 2; })
        .attr("dy", "0.34em")
        .attr("text-anchor", function (d) { return d.x0 < W / 2 ? "start" : "end"; })
        .text(function (d) { return d.name; });

      if (!prefersReduced) {
        link.attr("stroke-opacity", 0).transition().delay(function (d, i) { return i * 55; }).duration(750).attr("stroke-opacity", 0.3);
        node.attr("opacity", 0).transition().duration(550).attr("opacity", 1);
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
