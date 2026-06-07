/* =========================================================================
   Pierce Lonergan - "signal from noise" particle field
   A few thousand particles begin as pure noise drifting through a flow field,
   then collapse and resolve into a coherent form (the name), hold, dissolve
   back to noise, and loop. The story of data work: raw noise into signal.

   High-performance 2D canvas. Theme-aware, pause-aware; reduced motion shows
   the resolved (formed) state statically. Caps work on small screens.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("flowCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var TEXT = ["PIERCE", "LONERGAN"];
  var COLORS = ["#f0a866", "#e07a5c", "#d56f7a", "#fbbf24", "#5fb0a8", "#e8956a"];

  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function noise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, particles = [], targets = [], fade = "rgba(20,16,12,0.09)", t = 0;
  var SC = 0.0016, SPEED = 1.0 * dpr;
  // phases: 0 noise, 1 forming, 2 formed, 3 dissolving
  var DUR = [200, 150, 230, 120], phase = 0, phaseT = 0;

  function readFade() {
    var bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#17130f";
    var h = bg.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    fade = isNaN(n) ? "rgba(20,16,12,0.09)" : "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + ",0.09)";
  }

  function computeTargets() {
    var off = document.createElement("canvas"); off.width = W; off.height = H;
    var o = off.getContext("2d");
    o.fillStyle = "#fff"; o.textAlign = "center"; o.textBaseline = "middle";
    var fs = Math.min(W * 0.155, H * 0.30);
    o.font = "700 " + fs + "px 'Space Grotesk', system-ui, sans-serif";
    var lh = fs * 1.02, startY = H / 2 - (TEXT.length - 1) * lh / 2;
    TEXT.forEach(function (line, i) { o.fillText(line, W / 2, startY + i * lh); });
    var img;
    try { img = o.getImageData(0, 0, W, H).data; } catch (e) { targets = [{ x: W / 2, y: H / 2 }]; return; }
    targets = [];
    var gap = Math.max(4, Math.round(5 * dpr));
    for (var y = 0; y < H; y += gap) for (var x = 0; x < W; x += gap) { if (img[(y * W + x) * 4 + 3] > 130) targets.push({ x: x, y: y }); }
    if (!targets.length) targets.push({ x: W / 2, y: H / 2 });
  }

  function size() {
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    W = Math.round(cw * dpr); H = Math.round(ch * dpr);
    canvas.width = W; canvas.height = H;
    computeTargets();
    var N = Math.min(Math.max(targets.length, 600), cw < 700 ? 1300 : 2800);
    particles = [];
    for (var i = 0; i < N; i++) {
      var tg = targets[i % targets.length];
      particles.push({ x: Math.random() * W, y: Math.random() * H, tx: tg.x, ty: tg.y, c: COLORS[i % COLORS.length] });
    }
    readFade();
    ctx.fillStyle = fade.replace("0.09", "1"); ctx.fillRect(0, 0, W, H);
  }

  function formAmount() {
    if (phase === 0) return 0;
    if (phase === 1) return ease(phaseT / DUR[1]);
    if (phase === 2) return 1;
    return 1 - ease(phaseT / DUR[3]);
  }
  function advance() { phaseT++; if (phaseT >= DUR[phase]) { phaseT = 0; phase = (phase + 1) % 4; } }

  function step() {
    ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = Math.max(1, dpr);
    var fa = formAmount(), inv = 1 - fa;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var ang = noise(p.x * SC + t * 0.04, p.y * SC) * Math.PI * 4;
      var vx = Math.cos(ang) * SPEED * inv + (p.tx - p.x) * 0.16 * fa;
      var vy = Math.sin(ang) * SPEED * inv + (p.ty - p.y) * 0.16 * fa;
      var nx = p.x + vx, ny = p.y + vy;
      ctx.strokeStyle = p.c;
      ctx.globalAlpha = 0.35 + 0.4 * fa;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny;
      if (fa < 0.25 && (p.x < 0 || p.x > W || p.y < 0 || p.y > H || Math.random() < 0.0015)) { p.x = Math.random() * W; p.y = Math.random() * H; }
    }
    ctx.globalAlpha = 1; t++; advance();
  }

  var raf = null, onScreen = true;
  function paused() { return document.documentElement.classList.contains("motion-paused"); }
  function frame() { raf = requestAnimationFrame(frame); if (!onScreen || paused() || document.hidden) return; step(); }
  function staticFormed() { phase = 2; phaseT = 0; for (var k = 0; k < 120; k++) step(); }

  readFade();
  size();
  if (prefersReduced) staticFormed();
  else raf = requestAnimationFrame(frame);

  window.addEventListener("resize", function () { clearTimeout(window.__flowr); window.__flowr = setTimeout(function () { phase = 0; phaseT = 0; size(); if (prefersReduced) staticFormed(); }, 200); }, { passive: true });
  if (window.MutationObserver) new MutationObserver(function () { readFade(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; }); }, { rootMargin: "120px" }).observe(canvas);
})();
