/* =========================================================================
   Pierce Lonergan - hero name particle reveal
   The canvas spans the whole hero, so a dense cloud of particles starts as
   chaos across the screen (no visible box), then rushes inward and collapses
   into the shape of "Pierce Lonergan" at the heading's real position. The
   crisp <h1> then fades in underneath and the particles fade out.
   The <h1> is real text (a11y/SEO); a head script + safety timeout + no-JS
   fallback guarantee it always becomes visible.
   ========================================================================= */
(function () {
  "use strict";

  function show() { document.documentElement.classList.add("name-shown"); }

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var h1 = document.getElementById("heroName");
  var canvas = document.getElementById("nameCanvas");
  if (!h1 || !canvas) { show(); return; }
  var ctx = canvas.getContext("2d");
  if (!ctx || prefersReduced) { show(); return; }

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, particles = [], color = "#241a12", raf = null, t = 0, phase = 0, phaseT = 0, done = false;
  // phases: CHAOS (drift across the hero, name unreadable), FORM (collapse into the name)
  var DUR = [60, 84], SC = 0.0026, SPEED = 2.2 * dpr;

  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function noise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function readColor() { var c = getComputedStyle(document.documentElement).getPropertyValue("--text").trim(); if (c) color = c; }

  function setup() {
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return false;
    canvas.width = W = Math.round(cw * dpr); canvas.height = H = Math.round(ch * dpr);
    var crect = canvas.getBoundingClientRect(), hrect = h1.getBoundingClientRect();
    if (!hrect.width || !hrect.height) return false;
    var ox = (hrect.left - crect.left) * dpr, oy = (hrect.top - crect.top) * dpr;
    var nW = Math.max(1, Math.round(hrect.width * dpr)), nH = Math.max(1, Math.round(hrect.height * dpr));
    var cs = getComputedStyle(h1), fs = parseFloat(cs.fontSize) * dpr;
    var off = document.createElement("canvas"); off.width = nW; off.height = nH;
    var o = off.getContext("2d");
    o.fillStyle = "#fff"; o.textAlign = "left"; o.textBaseline = "alphabetic"; o.font = "700 " + fs + "px " + cs.fontFamily;
    try { o.letterSpacing = "-0.03em"; } catch (e) {}
    var lh = fs * 0.98;
    o.fillText("Pierce", 0, fs * 0.80); o.fillText("Lonergan", 0, fs * 0.80 + lh);
    var img; try { img = o.getImageData(0, 0, nW, nH).data; } catch (e) { return false; }
    var pts = [], gap = Math.max(2, Math.round(2.3 * dpr));
    for (var y = 0; y < nH; y += gap) for (var x = 0; x < nW; x += gap) { if (img[(y * nW + x) * 4 + 3] > 130) pts.push(x + ox, y + oy); }
    if (!pts.length) return false;
    var total = pts.length / 2, cap = 16000, stride = total > cap ? Math.ceil(total / cap) : 1;
    particles = [];
    for (var i = 0; i < total; i += stride) {
      particles.push({ x: Math.random() * W, y: Math.random() * H, tx: pts[i * 2], ty: pts[i * 2 + 1], v: 0.06 + Math.random() * 0.07, vx: 0, vy: 0 });
    }
    return true;
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    var fa = phase === 0 ? 0 : ease(phaseT / DUR[1]), inv = 1 - fa, s = Math.max(1, 1.25 * dpr);
    ctx.globalAlpha = 0.85;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var ang = noise(p.x * SC + t * 0.05, p.y * SC) * Math.PI * 4;
      p.x += Math.cos(ang) * SPEED * inv + (p.tx - p.x) * 0.17 * fa;
      p.y += Math.sin(ang) * SPEED * inv + (p.ty - p.y) * 0.17 * fa;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1; t++; phaseT++;
    if (phaseT >= DUR[phase]) { phaseT = 0; if (phase === 0) phase = 1; else { handoff(); return; } }
    raf = requestAnimationFrame(step);
  }

  function handoff() {
    if (done) return; done = true;
    show();
    canvas.style.transition = "opacity 0.7s ease"; canvas.style.opacity = "0";
    setTimeout(function () { if (raf) cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); }, 800);
  }

  /* Hover delight: the settled name scatters apart and re-condenses (fine pointers, cooldown) */
  var replaying = false, lastReplay = 0, rT = 0, rphase = 0;
  function replayStep() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    var s = Math.max(1, 1.25 * dpr);
    ctx.globalAlpha = 0.9;
    rT++;
    if (rphase === 0 && rT > 22) { rphase = 1; rT = 0; }
    var fa = rphase === 0 ? 0 : ease(Math.min(1, rT / 50));
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.vx *= 0.9; p.vy *= 0.9;
      p.x += p.vx + (p.tx - p.x) * 0.2 * fa;
      p.y += p.vy + (p.ty - p.y) * 0.2 * fa;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    if (rphase === 1 && rT >= 56) { finishReplay(); return; }
    raf = requestAnimationFrame(replayStep);
  }
  function startReplay() {
    if (!done || replaying) return;
    var now = Date.now();
    if (now - lastReplay < 4000) return;
    lastReplay = now;
    replaying = true;
    document.documentElement.classList.add("name-replay");
    document.documentElement.classList.remove("name-shown");
    canvas.style.transition = "none";
    canvas.style.opacity = "1";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i], a = Math.random() * Math.PI * 2, m = (1.5 + Math.random() * 7) * dpr;
      p.x = p.tx; p.y = p.ty;
      p.vx = Math.cos(a) * m; p.vy = Math.sin(a) * m;
    }
    rphase = 0; rT = 0;
    raf = requestAnimationFrame(replayStep);
  }
  function finishReplay() {
    replaying = false;
    document.documentElement.classList.remove("name-replay");
    show();
    canvas.style.transition = "opacity 0.5s ease";
    canvas.style.opacity = "0";
  }
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    h1.addEventListener("pointerenter", startReplay);
  }

  function run() { readColor(); if (!setup()) { show(); return; } raf = requestAnimationFrame(step); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run).catch(run); else run();
})();
