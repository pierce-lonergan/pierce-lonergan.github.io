/* =========================================================================
   Pierce Lonergan - micro-interactions
   Magnetic buttons and 3D-tilt cards with a cursor-tracking glow. Fine
   pointers only, springs stay under the ~15% bounce taste line, and the
   whole module is inert under prefers-reduced-motion or on touch devices.
   ========================================================================= */
(function () {
  "use strict";

  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduced) return;

  var SPRING = "cubic-bezier(0.3, 1.4, 0.55, 1)"; // gentle overshoot on release

  /* Magnetic pull on buttons: they lean toward the cursor, spring back on leave */
  function magnetize(el) {
    el.addEventListener("pointerenter", function () { el.style.transition = "transform 0.16s ease-out"; });
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = "translate(" + (dx * 0.16).toFixed(1) + "px," + (dy * 0.3 - 2).toFixed(1) + "px)";
    });
    el.addEventListener("pointerleave", function () {
      el.style.transition = "transform 0.55s " + SPRING;
      el.style.transform = "";
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".btn, .icon-btn, .cmdk-trigger, .cb-launcher"), magnetize);

  /* Cards: subtle 3D tilt toward the cursor plus a tracking glow */
  function tiltify(card) {
    card.classList.add("has-glow");
    card.addEventListener("pointerenter", function () { card.style.transition = "transform 0.14s ease-out"; });
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      card.style.transform = "perspective(900px) rotateY(" + ((px - 0.5) * 5).toFixed(2) + "deg) rotateX(" + ((0.5 - py) * 5).toFixed(2) + "deg) translateY(-4px)";
    });
    card.addEventListener("pointerleave", function () {
      card.style.transition = "transform 0.6s " + SPRING;
      card.style.transform = "";
    });
  }
  function wireCards() {
    Array.prototype.forEach.call(document.querySelectorAll(".project-card, .skill-card, .edu-card"), function (c) {
      if (!c.__tilted) { c.__tilted = true; tiltify(c); }
    });
  }
  wireCards();

  /* Normalize icon strokes so they can draw themselves on card hover */
  function prepIcons(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(".skill-ico, .pc-icon, .edu-icon svg"), function (svg) {
      Array.prototype.forEach.call(svg.querySelectorAll("path, circle, ellipse"), function (p) { p.setAttribute("pathLength", "1"); });
    });
  }
  prepIcons();

  // Project cards are injected by script.js; catch them once they exist.
  var grid = document.getElementById("projectsGrid");
  if (grid && window.MutationObserver) new MutationObserver(function () { wireCards(); prepIcons(grid); }).observe(grid, { childList: true });
})();
