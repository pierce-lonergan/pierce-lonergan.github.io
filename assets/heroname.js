/* =========================================================================
   Pierce Lonergan - hero name particle entrance
   On load, dust scatters across the name, then rushes and condenses into the
   shape of "Pierce Lonergan" in the heading's own color, then fades out,
   leaving the crisp <h1> underneath (kept for legibility, a11y, and SEO).
   One-time, reduced-motion safe (skips entirely), and degrades to nothing.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var h1 = document.getElementById("heroName");
  var canvas = document.getElementById("nameCanvas");
  if (!h1 || !canvas || prefersReduced) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, particles = [], color = "#241a12", raf = null, frames = 0, fading = false, fadeT = 0;

  function readColor() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
    if (c) color = c;
  }

  function setup() {
    var cw = h1.clientWidth, ch = h1.clientHeight;
    if (!cw || !ch) return false;
    canvas.width = W = Math.round(cw * dpr);
    canvas.height = H = Math.round(ch * dpr);
    var cs = getComputedStyle(h1);
    var fs = parseFloat(cs.fontSize) * dpr;
    var off = document.createElement("canvas"); off.width = W; off.height = H;
    var o = off.getContext("2d");
    o.fillStyle = "#fff"; o.textAlign = "left"; o.textBaseline = "alphabetic";
    o.font = "700 " + fs + "px " + cs.fontFamily;
    try { o.letterSpacing = "-0.03em"; } catch (e) {}
    var lh = fs * 0.98;
    o.fillText("Pierce", 0, fs * 0.80);
    o.fillText("Lonergan", 0, fs * 0.80 + lh);
    var img;
    try { img = o.getImageData(0, 0, W, H).data; } catch (e) { return false; }
    var pts = [], gap = Math.max(3, Math.round(4 * dpr));
    for (var y = 0; y < H; y += gap) for (var x = 0; x < W; x += gap) { if (img[(y * W + x) * 4 + 3] > 130) pts.push(x, y); }
    if (!pts.length) return false;
    // cap particle count
    var total = pts.length / 2, stride = total > 4200 ? Math.ceil(total / 4200) : 1;
    particles = [];
    for (var i = 0; i < total; i += stride) {
      particles.push({ x: Math.random() * W, y: Math.random() * H, tx: pts[i * 2], ty: pts[i * 2 + 1], v: 0.05 + Math.random() * 0.06 });
    }
    return true;
  }

  function step() {
    frames++;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    var s = Math.max(1.4, 1.6 * dpr);
    ctx.globalAlpha = (fading ? Math.max(0, 1 - fadeT / 30) : 1) * 0.92;
    var maxd = 0;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += (p.tx - p.x) * p.v; p.y += (p.ty - p.y) * p.v;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      var dx = p.tx - p.x, dy = p.ty - p.y, d = dx * dx + dy * dy; if (d > maxd) maxd = d;
    }
    ctx.globalAlpha = 1;
    if (!fading && (frames > 64 || maxd < 1.5)) fading = true;
    if (fading) { fadeT++; if (fadeT > 34) { ctx.clearRect(0, 0, W, H); if (raf) cancelAnimationFrame(raf); return; } }
    raf = requestAnimationFrame(step);
  }

  function run() {
    readColor();
    if (!setup()) return;
    raf = requestAnimationFrame(step);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run).catch(run);
  else run();
})();
