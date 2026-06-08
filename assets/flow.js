/* =========================================================================
   Pierce Lonergan - "signal from noise" particle field
   A few thousand particles drift as pure noise, then collapse and resolve
   into a word, hold, dissolve back to noise, and reform as the next word in
   a cycle (NOISE -> SIGNAL -> STREAM -> SCALE). Raw noise into signal.

   Transparent canvas (trails fade via destination-out) so the particles
   overlay the page's warm background rather than sitting in a box.
   Theme-agnostic colors, pause-aware; reduced motion holds one resolved word.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("flowCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var WORDS = ["NOISE", "SIGNAL", "STREAM", "SCALE"];
  var COLORS = ["#e07a5c", "#d56f7a", "#5fb0a8", "#e8956a", "#cf6a8a", "#eab04a"];

  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function noise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, particles = [], targets = [], t = 0, N = 2200;
  var SC = 0.0016, SPEED = 1.05 * dpr;
  // phases: NOISE(0), FORM(1), HOLD(2), DISSOLVE(3)
  var DUR = [120, 150, 180, 110], phase = 0, phaseT = 0, wordIndex = 0;

  function computeTargets(word) {
    var off = document.createElement("canvas"); off.width = W; off.height = H;
    var o = off.getContext("2d");
    o.fillStyle = "#fff"; o.textAlign = "center"; o.textBaseline = "middle";
    var fs = Math.min(W / Math.max(4, word.length) * 1.55, H * 0.5);
    o.font = "700 " + fs + "px 'Space Grotesk', system-ui, sans-serif";
    o.fillText(word, W / 2, H / 2);
    var img;
    try { img = o.getImageData(0, 0, W, H).data; } catch (e) { targets = [{ x: W / 2, y: H / 2 }]; return; }
    targets = [];
    var gap = Math.max(4, Math.round(5 * dpr));
    for (var y = 0; y < H; y += gap) for (var x = 0; x < W; x += gap) { if (img[(y * W + x) * 4 + 3] > 130) targets.push({ x: x, y: y }); }
    if (!targets.length) targets.push({ x: W / 2, y: H / 2 });
  }
  function assignTargets() { for (var i = 0; i < particles.length; i++) { var tg = targets[i % targets.length]; particles[i].tx = tg.x; particles[i].ty = tg.y; } }

  function size() {
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    W = Math.round(cw * dpr); H = Math.round(ch * dpr);
    canvas.width = W; canvas.height = H;
    N = cw < 700 ? 1300 : 2400;
    computeTargets(WORDS[wordIndex]);
    particles = [];
    for (var i = 0; i < N; i++) { var tg = targets[i % targets.length]; particles.push({ x: Math.random() * W, y: Math.random() * H, tx: tg.x, ty: tg.y, c: COLORS[i % COLORS.length] }); }
    ctx.clearRect(0, 0, W, H);
  }

  function formAmount() {
    if (phase === 0) return 0;
    if (phase === 1) return ease(phaseT / DUR[1]);
    if (phase === 2) return 1;
    return 1 - ease(phaseT / DUR[3]);
  }
  function advance() {
    phaseT++;
    if (phaseT >= DUR[phase]) {
      phaseT = 0; var prev = phase; phase = (phase + 1) % 4;
      if (prev === 3) { wordIndex = (wordIndex + 1) % WORDS.length; computeTargets(WORDS[wordIndex]); assignTargets(); }
    }
  }

  function step() {
    // Fade existing trails toward transparent so the page background shows through.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.09)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = Math.max(1, dpr);
    var fa = formAmount(), inv = 1 - fa;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var ang = noise(p.x * SC + t * 0.04, p.y * SC) * Math.PI * 4;
      var nx = p.x + Math.cos(ang) * SPEED * inv + (p.tx - p.x) * 0.16 * fa;
      var ny = p.y + Math.sin(ang) * SPEED * inv + (p.ty - p.y) * 0.16 * fa;
      ctx.strokeStyle = p.c;
      ctx.globalAlpha = 0.4 + 0.5 * fa;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny;
      if (fa < 0.25 && (p.x < 0 || p.x > W || p.y < 0 || p.y > H || Math.random() < 0.0015)) { p.x = Math.random() * W; p.y = Math.random() * H; }
    }
    ctx.globalAlpha = 1; t++; advance();
  }

  var raf = null, onScreen = true;
  function paused() { return document.documentElement.classList.contains("motion-paused"); }
  function frame() { raf = requestAnimationFrame(frame); if (!onScreen || paused() || document.hidden) return; step(); }
  function staticFormed() { phase = 1; phaseT = DUR[1]; for (var k = 0; k < 120; k++) { phase = 2; step(); } }

  size();
  if (prefersReduced) staticFormed();
  else raf = requestAnimationFrame(frame);

  window.addEventListener("resize", function () { clearTimeout(window.__flowr); window.__flowr = setTimeout(function () { phase = 0; phaseT = 0; size(); if (prefersReduced) staticFormed(); }, 200); }, { passive: true });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; }); }, { rootMargin: "120px" }).observe(canvas);
})();
