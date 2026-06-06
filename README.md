# pierce-lonergan.github.io

My personal portfolio and résumé site. **Pierce Lonergan**, Software Engineer III @ JPMorganChase.

A single-page, framework-free site (vanilla HTML, CSS, and JS, no build step) covering my
experience, skills, open-source projects, and education. Built to be fast, accessible, and to
print cleanly to a one-page résumé (`Ctrl/Cmd + P`).

## Features

- **Live 3D data-flow pipeline** in the hero: my streaming and lakehouse architecture rendered as
  a directed graph with particles flowing along the edges (Three.js / WebGL via 3d-force-graph).
- **Interactive skill constellation**: a force-directed graph of the stack, clustered by domain,
  that you can drag and spin.
- **In-browser AI assistant**: an "ask my résumé anything" chatbot that runs a language model fully
  in your browser via WebGPU (WebLLM), grounded by client-side retrieval over my résumé. No server,
  no API keys, nothing leaves your machine. Falls back to fast extractive search where WebGPU is absent.
- **Animated aurora backdrop**, glass cards, and a brand gradient throughout.
- **Dark and light theme** toggle (remembers your choice).
- **Scroll-spy navigation**, a scroll-progress bar, and reveal-on-scroll animations.
- **Animated stat counters** and a rotating hero headline.
- **Live GitHub integration**: project cards refresh their star counts from the GitHub API, with a
  curated static fallback so the page is perfect offline.
- **Fully responsive**, honors `prefers-reduced-motion`, and degrades gracefully without WebGL or WebGPU.
- **Print stylesheet**: the page collapses into a clean résumé when printed or saved as PDF.

## Structure

```
index.html          # markup + content
styles.css          # theming (CSS custom properties), layout, animations, print
script.js           # theme, scroll-spy, reveals, counters, live project cards
assets/knowledge.js # résumé knowledge base used by the AI assistant (client-side RAG)
assets/viz.js       # 3D hero pipeline + skill constellation (lazy-loaded, with fallbacks)
assets/chat.js      # in-browser AI assistant (WebLLM + Transformers.js retrieval)
assets/favicon.svg
```

The 3D graphics and the in-browser model load on demand from a CDN, so there is still no build step
and nothing to install.

## Run locally

It is static. Open `index.html`, or serve the folder:

```bash
python -m http.server 8080
# open http://localhost:8080
```

Serving over http (rather than opening the file directly) is recommended so the AI assistant and the
3D modules can load their CDN dependencies and use WebGPU.

## Deploy (GitHub Pages)

This repo is named `pierce-lonergan.github.io`, so once it is **public** GitHub Pages serves it
automatically at <https://pierce-lonergan.github.io/>. To go live:

1. Push to `main`.
2. Settings, then Pages, then Source: Deploy from a branch, branch `main`, folder `/ (root)`.
3. Private repos require GitHub Pro for Pages; otherwise make the repo public.

## Contact

- LinkedIn: <https://www.linkedin.com/in/pierce-lonergan-84034422a/>
- GitHub: <https://github.com/pierce-lonergan>

---

<sub>© Pierce Lonergan. Content reflects my professional history; design and copy are open for reference.</sub>
