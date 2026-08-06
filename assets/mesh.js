/* =========================================================================
   Pierce Lonergan - living mesh gradient (hero backdrop)
   A slow, warm, shader-driven gradient (full-screen GLSL fragment shader,
   simplex-noise color fields) behind the hero. Theme-aware: reads the warm
   palette from CSS custom properties and re-reads on theme toggle.

   Degrades silently: if WebGL is unavailable or a shader fails to compile,
   the canvas stays transparent and the CSS aurora behind it carries the look.
   Honors prefers-reduced-motion (renders one static frame) and a global
   motion-pause control (WCAG 2.2.2). Renders at a low resolution since a
   soft gradient needs no detail, so it stays cheap.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("meshCanvas");
  if (!canvas) return;

  var gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false })
        || canvas.getContext("experimental-webgl");
  if (!gl) return; // CSS aurora remains as the fallback

  var VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 u_res; uniform float u_time; uniform float u_mix;",
    "uniform vec3 u_base; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3;",
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}",
    "float snoise(vec2 v){",
    "  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);",
    "  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);",
    "  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);",
    "  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);",
    "  vec3 perm=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));",
    "  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;",
    "  vec3 x=2.0*fract(perm*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;",
    "  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);",
    "  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;",
    "  return 130.0*dot(m,g);",
    "}",
    "float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*snoise(p); p*=2.0; a*=0.5; } return s; }",
    "void main(){",
    "  vec2 p=(gl_FragCoord.xy-0.5*u_res.xy)/u_res.y;",
    "  float t=u_time*0.025;",
    "  float n1=fbm(p*1.05+vec2(t,t*0.6));",
    "  float n2=fbm(p*0.75+vec2(-t*0.5,t*0.45)+5.0);",
    "  float n3=fbm(p*1.45+vec2(t*0.2,-t*0.35)+9.0);",
    "  vec3 col=u_base;",
    "  col=mix(col,u_c1,clamp(smoothstep(-0.25,0.85,n1)*0.55*u_mix,0.0,1.0));",
    "  col=mix(col,u_c2,clamp(smoothstep(-0.10,0.90,n2)*0.40*u_mix,0.0,1.0));",
    "  col=mix(col,u_c3,clamp(smoothstep(0.00,0.95,n3)*0.32*u_mix,0.0,1.0));",
    "  float vig=smoothstep(1.35,0.15,length(p));",
    "  col=mix(u_base,col,0.30+0.70*vig);",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // Full-screen triangle.
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "u_res");
  var uTime = gl.getUniformLocation(prog, "u_time");
  var uBase = gl.getUniformLocation(prog, "u_base");
  var uC1 = gl.getUniformLocation(prog, "u_c1");
  var uC2 = gl.getUniformLocation(prog, "u_c2");
  var uC3 = gl.getUniformLocation(prog, "u_c3");
  var uMix = gl.getUniformLocation(prog, "u_mix");

  function hex2rgb(h) {
    h = (h || "").trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length < 6) return null;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function colors() {
    var cs = getComputedStyle(document.documentElement);
    var base = hex2rgb(cs.getPropertyValue("--bg")) || [0.09, 0.075, 0.06];
    var c1 = hex2rgb(cs.getPropertyValue("--g2")) || [0.88, 0.48, 0.36];   // terracotta
    var c2 = hex2rgb(cs.getPropertyValue("--g1")) || [0.94, 0.66, 0.40];   // amber
    var c3 = hex2rgb(cs.getPropertyValue("--g3")) || [0.84, 0.43, 0.48];   // rose
    gl.uniform3fv(uBase, base); gl.uniform3fv(uC1, c1); gl.uniform3fv(uC2, c2); gl.uniform3fv(uC3, c3);
    // The light theme mixes warm accents over a near-white base, so the same factors
    // that read rich on #17130f wash out on #faf5ef. Depth is theme-tunable.
    var mixv = parseFloat(cs.getPropertyValue("--mesh-mix")) || 1;
    gl.uniform1f(uMix, mixv);
  }

  var dpr = Math.min(window.devicePixelRatio || 1, 1.4);
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var sw = Math.max(2, Math.round(w * dpr * 0.62)); // low-res; it's a soft gradient
    var sh = Math.max(2, Math.round(h * dpr * 0.62));
    if (canvas.width !== sw || canvas.height !== sh) { canvas.width = sw; canvas.height = sh; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  function draw(t) { gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3); }

  // ---- lifecycle ----
  var raf = null, start = null, last = 0, onScreen = true;
  function paused() { return document.documentElement.classList.contains("motion-paused"); }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!onScreen || paused() || document.hidden) return;
    if (start == null) start = ts;
    last = (ts - start) / 1000;
    resize();
    colors();
    draw(last);
  }
  function renderStatic() { resize(); colors(); draw(prefersReduced ? 3.2 : last); }

  colors();
  resize();
  if (prefersReduced) {
    renderStatic();
  } else {
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", function () { clearTimeout(window.__meshr); window.__meshr = setTimeout(function () { resize(); if (prefersReduced || paused()) renderStatic(); }, 150); }, { passive: true });

  // Re-theme when the user toggles light/dark.
  if (window.MutationObserver) {
    new MutationObserver(function () { colors(); renderStatic(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  // Pause render when the hero is well offscreen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; }); }, { rootMargin: "100px" }).observe(canvas);
  }

  // Degrade gracefully if the GPU context is lost: drop the canvas so the CSS
  // aurora carries the hero, never a black rectangle.
  if (window.PL_guardCanvas) window.PL_guardCanvas(canvas, {
    restore: false,
    onLost: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } canvas.style.opacity = "0"; }
  });

  // A pause control would be visible to all; expose for the global toggle to repaint on resume.
  window.PL_meshRepaint = renderStatic;
})();
