/* =========================================================================
   Pierce Lonergan - capability oracle
   One cheap, shared read of the device's graphics capability -> a render tier
   every scene can consult (window.PL_CAP + a tier-* class on <html>), plus a
   reusable WebGL context-loss guard so a lost GPU context degrades to a
   designed poster instead of a permanent black canvas. Loads first.
   ========================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;

  function hasWebGL2() { try { var c = document.createElement("canvas"); return !!c.getContext("webgl2"); } catch (e) { return false; } }
  var mql = window.matchMedia || function () { return { matches: false }; };
  var reduced = mql("(prefers-reduced-motion: reduce)").matches;
  var coarse = mql("(pointer: coarse)").matches;
  var mem = navigator.deviceMemory || null;
  var gpu = !!navigator.gpu;
  var gl2 = hasWebGL2();
  var dpr = window.devicePixelRatio || 1;
  var small = window.innerWidth < 720;

  // Render tier: STATIC (no motion) < LITE (weak/mobile) < HIGH (desktop GPU) < ULTRA (WebGPU).
  var tier;
  if (reduced) tier = "static";
  else if (!gl2) tier = "lite";
  else if (coarse || small || (mem && mem <= 4)) tier = "lite";
  else if (gpu) tier = "ultra";
  else tier = "high";

  window.PL_CAP = { tier: tier, webgpu: gpu, webgl2: gl2, coarse: coarse, deviceMemory: mem, dpr: dpr, reducedMotion: reduced };
  root.classList.add("tier-" + tier);

  // Guard a WebGL canvas: a lost context degrades gracefully instead of going black.
  window.PL_guardCanvas = function (canvas, opts) {
    if (!canvas || !canvas.addEventListener) return;
    opts = opts || {};
    var losses = 0;
    canvas.addEventListener("webglcontextlost", function (e) {
      if (opts.restore !== false) { try { e.preventDefault(); } catch (_) {} } // allow a restore attempt
      losses++;
      try { if (opts.onLost) opts.onLost(losses); } catch (_) {}
      if (losses >= 2 && opts.onPoster) { try { opts.onPoster(); } catch (_) {} }
    }, false);
    canvas.addEventListener("webglcontextrestored", function () {
      try { if (opts.onRestored) opts.onRestored(); } catch (_) {}
    }, false);
  };
})();
