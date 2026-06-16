/* =========================================================================
   Pierce Lonergan - "trace one event"
   A scrubbable distributed-trace waterfall (Jaeger/OTel style) following one
   event through the platform. The slow path stalls on a p99 model-inference
   span; a mitigation toggle replays the same trace with the fix. As the
   playhead crosses each span it pulses the matching DAG stage above
   (window.PL_pipelinePulse). Hand-authored synthetic timings, illustrative.
   Keyboard-scrubbable, pause/reduced-motion aware, static when not playing.
   ========================================================================= */
(function () {
  "use strict";
  var host = document.getElementById("traceChart");
  if (!host) return;
  var scrub = document.getElementById("traceScrub");
  var playBtn = document.getElementById("tracePlay");
  var fix = document.getElementById("traceFix");
  var readout = document.getElementById("traceReadout");
  var COLORS = { api: "#f0a866", kafka: "#5fb0a8", schema: "#fbbf24", spark: "#e07a5c", silver: "#bcae93", mlf: "#b07e9e" };

  function spans(m) {
    var inf = m ? 12 : 95; // the p99 inference stall, fixed by the mitigation
    return [
      { name: "ingest · API event", node: "api", start: 0, dur: 8, kind: "network" },
      { name: "kafka append", node: "kafka", start: 8, dur: 5, kind: "queue" },
      { name: "schema validate · Avro", node: "schema", start: 13, dur: 6, child: 1, kind: "compute" },
      { name: "spark · streaming", node: "spark", start: 19, dur: 22, kind: "compute" },
      { name: "dedup + watermark", node: "spark", start: 23, dur: 9, child: 1, kind: "compute" },
      { name: "iceberg write · bronze→silver", node: "silver", start: 41, dur: 14, kind: "storage" },
      { name: "feature lookup", node: "mlf", start: 55, dur: 7, child: 1, kind: "cache" },
      { name: "model inference", node: "mlf", start: 62, dur: inf, hot: !m, kind: "model" },
      { name: "sink · serve", node: "mlf", start: 62 + inf, dur: 6, kind: "network" }
    ];
  }

  var data, total, rows, lastActive = -1, tip = null, crit = null, engaged = false;

  function build() {
    data = spans(fix && fix.checked);
    total = data.reduce(function (mx, s) { return Math.max(mx, s.start + s.dur); }, 0);
    crit = null; data.forEach(function (s) { if (!s.child && (!crit || s.dur > crit.dur)) crit = s; }); // critical-path bottleneck
    engaged = false;
    host.innerHTML = "";
    // Time axis with ms tick labels (gridlines are drawn on every track via CSS).
    var axis = document.createElement("div"); axis.className = "trace-row trace-axis";
    var axLabel = document.createElement("span"); axLabel.className = "trace-label"; axLabel.textContent = "service / span";
    var axTrack = document.createElement("div"); axTrack.className = "trace-track trace-axis-track";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var tk = document.createElement("span"); tk.className = "trace-tick";
      tk.style.left = (f * 100) + "%"; tk.textContent = Math.round(f * total) + (f === 1 ? " ms" : "");
      axTrack.appendChild(tk);
    });
    axis.appendChild(axLabel); axis.appendChild(axTrack); host.appendChild(axis);
    tip = document.createElement("div"); tip.className = "trace-tooltip"; host.appendChild(tip);

    rows = data.map(function (s) {
      var row = document.createElement("div"); row.className = "trace-row";
      var label = document.createElement("span");
      label.className = "trace-label" + (s.child ? " is-child" : "");
      label.innerHTML = '<span class="trace-kind k-' + (s.kind || "") + '"></span>' + esc(s.name) + " · " + s.dur + "ms" + (s.hot ? "  ⚠" : "");
      var track = document.createElement("div"); track.className = "trace-track";
      var bar = document.createElement("div"); bar.className = "trace-bar" + (s.hot ? " trace-hot" : "");
      bar.style.left = (s.start / total * 100).toFixed(2) + "%";
      bar.style.width = Math.max(1.5, s.dur / total * 100).toFixed(2) + "%";
      bar.style.color = COLORS[s.node] || "#e07a5c"; // currentColor drives the gradient fill + glow
      bar.style.setProperty("--fill", "100%");
      bar.addEventListener("mouseenter", function () { showTip(s, bar); });
      bar.addEventListener("mouseleave", function () { if (tip) tip.classList.remove("on"); });
      track.appendChild(bar); row.appendChild(label); row.appendChild(track); host.appendChild(row);
      return { s: s, bar: bar };
    });
    lastActive = -1;
    setT(0);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function showTip(s, bar) {
    if (!tip) return;
    tip.innerHTML = "<b>" + esc(s.name) + "</b><br>" + (s.kind || "span") + " · " + s.node + "<br>T+" + s.start + "–" + (s.start + s.dur) + " ms (" + s.dur + " ms)" + (s.hot ? '<br><span class="tt-hot">p99 stall (see mitigation)</span>' : "");
    var br = bar.getBoundingClientRect(), hr = host.getBoundingClientRect();
    tip.style.left = (br.left - hr.left + br.width / 2) + "px";
    tip.style.top = (br.top - hr.top - 8) + "px";
    tip.classList.add("on");
  }

  function setT(t) {
    var active = -1, a = null;
    rows.forEach(function (r) {
      var s = r.s, on = (t >= s.start && t <= s.start + s.dur);
      r.bar.classList.toggle("trace-on", on);
      r.bar.classList.toggle("trace-done", t > s.start + s.dur);
      if (engaged) { var f = t <= s.start ? 0 : (t >= s.start + s.dur ? 100 : (t - s.start) / s.dur * 100); r.bar.style.setProperty("--fill", f.toFixed(1) + "%"); }
      else r.bar.style.setProperty("--fill", "100%");
      if (on) { active = data.indexOf(s); a = s; }
    });
    if (active !== lastActive) {
      lastActive = active;
      if (active >= 0 && window.PL_pipelinePulse) { try { window.PL_pipelinePulse(data[active].node); } catch (e) {} }
    }
    if (scrub && document.activeElement !== scrub) scrub.value = Math.round(total ? t / total * 1000 : 0);
    if (readout) readout.textContent = "T+" + Math.round(t) + " / " + total + " ms · " + ((fix && fix.checked) ? "mitigated" : "slow path") + "  ·  bottleneck " + (crit ? crit.name + " " + crit.dur + "ms" : "n/a") + (a ? "  →  " + a.name + (a.hot ? " (stall)" : "") : "");
  }

  var raf = null, playing = false, t0 = null, startT = 0;
  function paused() { return document.documentElement.classList.contains("motion-paused"); }
  function frame(ts) {
    if (!playing) return;
    if (paused() || document.hidden) { raf = requestAnimationFrame(frame); return; }
    if (t0 == null) t0 = ts;
    var t = startT + (ts - t0) * 0.06; // 1 trace-ms ≈ 16ms real, slowed for legibility
    if (t >= total) { setT(total); stop(); return; }
    setT(t);
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (playing) return;
    engaged = true;
    startT = scrub ? (scrub.value / 1000 * total) : 0;
    if (startT >= total - 0.5) startT = 0;
    playing = true; t0 = null; lastActive = -1;
    if (playBtn) playBtn.textContent = "❚❚ Pause";
    raf = requestAnimationFrame(frame);
  }
  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); if (playBtn) playBtn.textContent = "▶ Play"; }

  if (scrub) scrub.addEventListener("input", function () { engaged = true; stop(); setT(scrub.value / 1000 * total); });
  if (playBtn) playBtn.addEventListener("click", function () { playing ? stop() : play(); });
  if (fix) fix.addEventListener("change", function () { stop(); build(); });
  build();
})();
