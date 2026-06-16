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
      { name: "ingest · API event", node: "src", start: 0, dur: 8 },
      { name: "kafka append", node: "kafka", start: 8, dur: 5 },
      { name: "schema validate · Avro", node: "schema", start: 13, dur: 6, child: 1 },
      { name: "spark · streaming", node: "spark", start: 19, dur: 22 },
      { name: "dedup + watermark", node: "spark", start: 23, dur: 9, child: 1 },
      { name: "iceberg write · bronze→silver", node: "silver", start: 41, dur: 14 },
      { name: "feature lookup", node: "mlf", start: 55, dur: 7, child: 1 },
      { name: "model inference", node: "mlf", start: 62, dur: inf, hot: !m },
      { name: "sink · serve", node: "mlf", start: 62 + inf, dur: 6 }
    ];
  }

  var data, total, rows, lastActive = -1;

  function build() {
    data = spans(fix && fix.checked);
    total = data.reduce(function (mx, s) { return Math.max(mx, s.start + s.dur); }, 0);
    host.innerHTML = "";
    rows = data.map(function (s) {
      var row = document.createElement("div"); row.className = "trace-row";
      var label = document.createElement("span");
      label.className = "trace-label" + (s.child ? " is-child" : "");
      label.textContent = s.name + " · " + s.dur + "ms" + (s.hot ? "  ⚠" : "");
      var track = document.createElement("div"); track.className = "trace-track";
      var bar = document.createElement("div"); bar.className = "trace-bar" + (s.hot ? " trace-hot" : "");
      bar.style.left = (s.start / total * 100).toFixed(2) + "%";
      bar.style.width = Math.max(1.5, s.dur / total * 100).toFixed(2) + "%";
      bar.style.background = COLORS[s.node] || "#e07a5c";
      bar.style.color = COLORS[s.node] || "#e07a5c"; // currentColor drives the active glow
      track.appendChild(bar); row.appendChild(label); row.appendChild(track); host.appendChild(row);
      return { s: s, bar: bar };
    });
    lastActive = -1;
    setT(0);
  }

  function setT(t) {
    var active = -1, a = null;
    rows.forEach(function (r) {
      var on = (t >= r.s.start && t <= r.s.start + r.s.dur);
      r.bar.classList.toggle("trace-on", on);
      r.bar.classList.toggle("trace-done", t > r.s.start + r.s.dur);
      if (on) { active = data.indexOf(r.s); a = r.s; }
    });
    if (active !== lastActive) {
      lastActive = active;
      if (active >= 0 && window.PL_pipelinePulse) { try { window.PL_pipelinePulse(data[active].node); } catch (e) {} }
    }
    if (scrub && document.activeElement !== scrub) scrub.value = Math.round(total ? t / total * 1000 : 0);
    if (readout) readout.textContent = "T+" + Math.round(t) + " / " + total + " ms · " + ((fix && fix.checked) ? "mitigated" : "slow path") + (a ? "  →  " + a.name + (a.hot ? " (stall)" : "") : "");
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
    startT = scrub ? (scrub.value / 1000 * total) : 0;
    if (startT >= total - 0.5) startT = 0;
    playing = true; t0 = null; lastActive = -1;
    if (playBtn) playBtn.textContent = "❚❚ Pause";
    raf = requestAnimationFrame(frame);
  }
  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); if (playBtn) playBtn.textContent = "▶ Play"; }

  if (scrub) scrub.addEventListener("input", function () { stop(); setT(scrub.value / 1000 * total); });
  if (playBtn) playBtn.addEventListener("click", function () { playing ? stop() : play(); });
  if (fix) fix.addEventListener("change", function () { stop(); build(); });
  build();
})();
