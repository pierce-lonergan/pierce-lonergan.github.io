# pierce-lonergan.github.io

My personal portfolio & résumé site — **Pierce Lonergan**, Software Engineer III @ JPMorganChase.

A single-page, framework-free site (vanilla HTML / CSS / JS, no build step) covering my
experience, skills, open-source projects, and education. Built to be fast, accessible, and
to print cleanly to a one-page résumé (`Ctrl/Cmd + P`).

## ✨ Features

- **Animated aurora backdrop**, glassmorphism cards, and a brand gradient throughout
- **Dark / light theme** toggle (remembers your choice)
- **Scroll-spy navigation**, scroll-progress bar, and reveal-on-scroll animations
- **Animated stat counters** and a rotating hero headline
- **Live GitHub integration** — project cards refresh their ⭐ counts from the GitHub API,
  with a curated static fallback so the page is perfect offline
- **Fully responsive** + honors `prefers-reduced-motion`
- **Print stylesheet** — the page collapses into a clean résumé when printed/saved as PDF

## 🗂 Structure

```
index.html        # markup + content
styles.css        # theming (CSS custom properties), layout, animations, print
script.js         # theme, scroll-spy, reveals, counters, live project cards
assets/favicon.svg
```

## 🚀 Run locally

It's static — just open `index.html`, or serve the folder:

```bash
python -m http.server 8080
# → http://localhost:8080
```

## 🌐 Deploy (GitHub Pages)

This repo is named `pierce-lonergan.github.io`, so once it's **public** GitHub Pages serves it
automatically at <https://pierce-lonergan.github.io/>. To go live:

1. Push to `main` (or `master`).
2. **Settings → Pages →** Source: *Deploy from a branch* → branch `main`, folder `/ (root)`.
3. (Private repos require GitHub Pro/Team for Pages; otherwise make the repo public.)

## 📫 Contact

- LinkedIn — <https://www.linkedin.com/in/pierce-lonergan-84034422a/>
- GitHub — <https://github.com/pierce-lonergan>

---

<sub>© Pierce Lonergan. Content reflects my professional history; design and copy are open for reference.</sub>
