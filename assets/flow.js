/* =========================================================================
   Pierce Lonergan - particle flow field
   Thousands of points drift through a noise field, the way events drift
   through a streaming platform. High-performance 2D canvas (value-noise
   flow field, trails via low-alpha fade). Theme-aware, pause-aware,
   reduced-motion renders a static frame, and it caps work on small screens.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("flowCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var COLORS = ["#f0a866", "#e07a5c", "#d56f7a", "#fbbf24", "#5fb0a8", "#e8956a"];

  // ---- compact value noise ----
  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function noise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  }

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, particles = [], fade = "rgba(20,16,12,0.06)", N = 1400, t = 0;

  function readTheme() {
    var bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#17130f";
    var h = bg.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) { fade = "rgba(20,16,12,0.06)"; return; }
    fade = "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + ",0.06)";
  }

  function size() {
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    W = Math.round(cw * dpr); H = Math.round(ch * dpr);
    canvas.width = W; canvas.height = H;
    N = cw < 700 ? 700 : 1400;
    spawn();
    // clear to base
    readTheme();
    ctx.fillStyle = fade.replace("0.06", "1");
    ctx.fillRect(0, 0, W, H);
  }
  function spawn() {
    particles = [];
    for (var i = 0; i < N; i++) particles.push({ x: Math.random() * W, y: Math.random() * H, c: COLORS[i % COLORS.length] });
  }

  var SC = 0.0016, SPEED = 0.9 * dpr;
  function step() {
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = Math.max(1, dpr * 0.9);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var ang = noise(p.x * SC + t * 0.04, p.y * SC) * Math.PI * 4;
      var nx = p.x + Math.cos(ang) * SPEED, ny = p.y + Math.sin(ang) * SPEED;
      ctx.strokeStyle = p.c;
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny;
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || Math.random() < 0.0016) { p.x = Math.random() * W; p.y = Math.random() * H; }
    }
    ctx.globalAlpha = 1;
    t += 1;
  }

  // ---- lifecycle ----
  var raf = null, onScreen = true;
  function paused() { return document.documentElement.classList.contains("motion-paused"); }
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!onScreen || paused() || document.hidden) return;
    step();
  }
  function staticFrame() { for (var k = 0; k < 90; k++) step(); }

  readTheme();
  size();
  if (prefersReduced) staticFrame();
  else raf = requestAnimationFrame(frame);

  window.addEventListener("resize", function () { clearTimeout(window.__flowr); window.__flowr = setTimeout(function () { size(); if (prefersReduced) staticFrame(); }, 180); }, { passive: true });
  if (window.MutationObserver) new MutationObserver(function () { readTheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; }); }, { rootMargin: "120px" }).observe(canvas);
})();
