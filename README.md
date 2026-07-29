# pierce-lonergan.github.io

My portfolio and résumé site. **Pierce Lonergan**, Software Engineer III @ JPMorganChase.

A single-page, framework-free site: vanilla HTML, CSS, and JavaScript with no build step, no
backend, no analytics, and no API keys. Everything below runs as static files on GitHub Pages;
the heavier pieces stream from CDNs on demand and degrade gracefully when WebGL, WebGPU, or
JavaScript itself is unavailable.

## What's inside

**The hero.** A custom GLSL simplex-noise mesh gradient (hand-written WebGL fragment shader on a
low-res canvas) breathes behind the page. The name condenses out of ~16,000 canvas particles on
load, and re-scatters when you hover it. The real `<h1>` is always present underneath for
accessibility and SEO.

**The platform, live.** My streaming/lakehouse architecture as a 14-node force-directed DAG
(3d-force-graph / Three.js), matching the Sankey below it stage for stage: three source types
into Kafka and Spark, through the Bronze/Silver/Gold medallion, out to Snowflake, ML features,
reverse ETL, and a dead-letter sink. Links carry throughput, so busier paths stream more and
wider particles. Stages boot in flow order, a guided pass then sweeps the backbone, every node
is labeled and clickable, telemetry ticks with a live sparkline, and an "inject chaos" button
runs a nine-second poison-pill incident whose backpressure cascades Spark to Bronze to Silver
before healing upstream first.

**Trace one event.** A scrubbable distributed-trace waterfall (the Jaeger/OTel idiom) following
one event end to end, with a time axis, span-kind coding, hover detail, and a comet fill that
crosses each span as the playhead advances. The slow path stalls on a p99 model-inference span;
an "apply mitigation" toggle replays the same trace with the fix, and the critical-path
bottleneck readout visibly moves off inference. Each active span pulses the matching DAG stage.

**Skill constellation.** A draggable 3D force graph of the stack, clustered by domain. Hovering
a skill chip in the cards below flares the matching node in the graph.

**The lakehouse, by volume.** A d3-sankey of the platform where ribbon width tracks throughput.
Ribbons grow in column order on first view, a dash stream flows along every link, and hovering a
node spotlights its flows.

**Ask AI.** An "ask my résumé anything" assistant that runs a language model fully in the
browser (WebLLM on WebGPU), grounded by client-side RAG: résumé chunks are embedded with a
sentence-transformer (Transformers.js), cosine-searched in plain JS, and the retrieved sections
appear as chips before the streamed answer. No server, no keys; falls back to extractive
retrieval without WebGPU.

**Retrieval, visualized.** Every résumé chunk plotted in embedding space (real cosine geometry,
not a mock). Type a query, or ask the assistant, and the matched points pulse, get name tags,
and the camera pans toward them.

**Fit check.** Paste a job description and it is split into requirements, embedded against the
résumé with the same sentence-transformer the assistant uses, and scored per requirement by
cosine similarity into a Strong/Partial/Gap evidence map with the gaps shown honestly. No LLM
and no WebGPU required, and nothing pasted leaves the device.

**Robustness.** A shared capability oracle profiles the device (WebGPU, WebGL2, device memory,
pointer, reduced-motion) into one render tier the scenes read. WebGL context loss is handled, so
a lost GPU context degrades to the CSS aurora instead of a black canvas. Every CDN dependency is
pinned to an exact version with an SRI integrity hash.

**Product craft.** Command palette (Ctrl/Cmd+K), circular view-transition theme toggle, magnetic
buttons, 3D-tilt cards with cursor glow, word-cascade headings, a scroll-drawn experience
timeline, self-drawing icons, a sliding nav indicator, and a colophon ("How this site works") in
the footer. Motion respects `prefers-reduced-motion` throughout, and a nav control pauses all
ambient animation (WCAG 2.2.2).

## Structure

```
index.html            # all markup and content
styles.css            # design system (custom properties), layout, animation, print
script.js             # theme, scroll-spy, reveals, counters, timeline, projects
assets/mesh.js        # GLSL mesh-gradient hero backdrop
assets/heroname.js    # particle name reveal + hover re-scatter
assets/capability.js  # device capability oracle + WebGL context-loss guard (loads first)
assets/viz.js         # platform DAG (boot, throughput particles, chaos, tour) + constellation
assets/trace.js       # scrubbable distributed-trace waterfall, synced to the DAG
assets/sankey.js      # throughput sankey with animated flow
assets/galaxy.js      # embedding-space map + retrieval highlighting
assets/knowledge.js   # résumé knowledge base for the assistant and the fit check
assets/chat.js        # in-browser LLM assistant (WebLLM + Transformers.js RAG)
assets/fit.js         # paste-a-JD client-side cosine fit map
assets/palette.js     # command palette + colophon
assets/micro.js       # magnetic buttons, card tilt/glow, icon stroke prep
scripts/resume.html   # source for the résumé PDF (Chrome headless --print-to-pdf)
assets/Pierce-Lonergan-Resume.pdf
assets/og.png         # social share card
```

## Run locally

```bash
python -m http.server 8080
# open http://localhost:8080
```

Serve over http rather than opening the file directly so the CDN modules and WebGPU work.

## Contact

- LinkedIn: <https://www.linkedin.com/in/pierce-lonergan-84034422a/>
- GitHub: <https://github.com/pierce-lonergan>

---

<sub>© Pierce Lonergan. Content reflects my professional history; design and code are open for reference.</sub>
