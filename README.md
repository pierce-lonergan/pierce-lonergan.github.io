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

**The platform, live.** My streaming/lakehouse architecture as a force-directed DAG
(3d-force-graph / Three.js): stages boot in flow order, particles stream along the edges, every
node is labeled and clickable, telemetry ticks with a live sparkline, and an "inject chaos"
button runs a nine-second poison-pill incident (backpressure, red telemetry, a pulsing alert)
that heals with a particle surge.

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
assets/viz.js         # platform DAG (boot, telemetry, chaos, labels) + constellation
assets/sankey.js      # throughput sankey with animated flow
assets/galaxy.js      # embedding-space map + retrieval highlighting
assets/knowledge.js   # résumé knowledge base for the assistant
assets/chat.js        # in-browser LLM assistant (WebLLM + Transformers.js RAG)
assets/palette.js     # command palette + colophon
assets/micro.js       # magnetic buttons, card tilt/glow, icon stroke prep
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
