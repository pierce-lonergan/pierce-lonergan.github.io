/* =========================================================================
   Pierce Lonergan — portfolio interactions
   Vanilla JS, no dependencies. Everything degrades gracefully.
   ========================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Theme */
  var root = document.documentElement;
  var themeToggle = $("#themeToggle");
  try {
    // Dark is the signature default for first-time visitors; honor a saved choice.
    var saved = localStorage.getItem("pl-theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) {}
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("pl-theme", next); } catch (e) {}
    });
  }

  /* ----------------------------------------------------------- Year stamp */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------- Nav: scrolled + menu */
  var nav = $("#nav");
  var progress = $("#scrollProgress");
  var navToggle = $("#navToggle");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("scrolled", y > 24);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("menu-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* --------------------------------------------------- Scroll-spy on nav */
  var navMap = {};
  $$(".nav-links a").forEach(function (a) {
    var id = a.getAttribute("href").replace("#", "");
    if (id) navMap[id] = a;
  });
  var sections = $$("section[id]").filter(function (s) { return navMap[s.id]; });
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          $$(".nav-links a").forEach(function (a) { a.classList.remove("active"); });
          if (navMap[en.target.id]) navMap[en.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------- Reveal on scroll */
  var revealEls = $$(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          // small natural stagger for groups entering together
          var delay = Math.min(i * 70, 280);
          setTimeout(function () { en.target.classList.add("in"); }, delay);
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revObs.observe(el); });
  }

  /* ----------------------------------------------------- Animated counters */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    if (prefersReduced) { el.textContent = prefix + target + suffix; return; }
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target + suffix;
    }
    requestAnimationFrame(step);
  }
  var statEls = $$(".stat-num");
  if (statEls.length) {
    if (!("IntersectionObserver" in window)) {
      statEls.forEach(animateCount);
    } else {
      var statObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); }
        });
      }, { threshold: 0.6 });
      statEls.forEach(function (el) { statObs.observe(el); });
    }
  }

  /* ------------------------------------------------------- Hero role rotator */
  var rotator = $("#roleRotator");
  if (rotator && !prefersReduced) {
    var words = ["data infrastructure", "streaming pipelines", "lakehouse platforms", "retrieval systems", "things that scale"];
    var idx = 0;
    setInterval(function () {
      var cur = rotator.firstChild;
      idx = (idx + 1) % words.length;
      var next = document.createElement("span");
      next.textContent = words[idx];
      next.className = "swap-in";
      if (cur) {
        cur.className = "swap-out";
        setTimeout(function () { if (cur && cur.parentNode) cur.parentNode.removeChild(cur); }, 400);
      }
      rotator.appendChild(next);
    }, 2600);
  }

  /* ============================================================ Projects */
  // Curated cards (great copy + ordering). Star counts refreshed live from
  // GitHub when available; otherwise these render exactly as-is.
  var LANG_COLORS = { Python: "#3776AB", Java: "#E76F00", "Java / Groovy": "#E76F00", HTML: "#E34C26", Groovy: "#4298B8" };
  var PROJECTS = [
    {
      name: "nexus_matcher",
      icon: '<svg class="pc-icon" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="6" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="5" cy="18" r="1.5"/><circle cx="19" cy="6" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="19" cy="18" r="1.5"/><path d="M6.5 6h11M6.5 12l11 6M6.5 18l11-6"/></svg>',
      title: "NexusMatcher",
      desc: "A personal R&D project: an enterprise-grade semantic schema-matching system. Multi-stage retrieval → neural reranking → learned type projections. 100% Precision@1, sub-4ms rerank latency, 433 passing tests.",
      lang: "Python",
      tags: ["RAG", "BM25 + dense", "ColBERT", "Qdrant"],
      repo: "https://github.com/pierce-lonergan/nexus_matcher"
    },
    {
      name: "NexusPiercer",
      icon: '<svg class="pc-icon" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16M8 7v10M12 10v4"/><path d="M13 12h7M17 9l3 3-3 3"/></svg>',
      title: "NexusPiercer",
      desc: "A data-engineering toolkit that pierces through deeply nested JSON & Avro, flattening, consolidating, and analyzing data and schemas into flat, Spark-ready structures with rich metadata. The recursive-flattening engine, productized.",
      lang: "Java / Groovy",
      tags: ["Java", "Avro", "Spark", "Schema"],
      repo: "https://github.com/pierce-lonergan/NexusPiercer"
    },
    {
      name: "MAMMAL_Cognitive_Enhancement_Drug_Repurposing",
      icon: '<svg class="pc-icon" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="16" r="2"/><circle cx="12" cy="13" r="1.4"/><path d="M12 7v4.2M10.7 13.9l-3 1.4M13.3 13.9l3 1.4"/></svg>',
      title: "MAMMAL Drug Repurposing",
      desc: "A multi-layer Bayesian pipeline for cognition-enhancement drug repurposing built on IBM Research's MAMMAL foundation model. Mechanism-class track record discriminates clinical success vs. failure at AUROC 1.00, and it runs on a single 12 GB consumer GPU.",
      lang: "Python",
      tags: ["Bayesian", "PyMC NUTS", "DTI", "Calibration"],
      repo: "https://github.com/pierce-lonergan/MAMMAL_Cognitive_Enhancement_Drug_Repurposing"
    },
    {
      name: "entropy-engine",
      icon: '<svg class="pc-icon" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18M5.5 9h13M8 13h8M10.5 17h3M11.5 21h1"/></svg>',
      title: "Entropy Engine",
      desc: "A chaos-engineering benchmark for AI agents: can an agent keep a data pipeline intact under schema drift, poison pills, and 10× backpressure? Built on Google A2A + Apache Kafka for the Berkeley RDI AgentBeats Competition.",
      lang: "Python",
      tags: ["Kafka", "Docker", "Google A2A", "Resilience"],
      repo: "https://github.com/pierce-lonergan/entropy-engine"
    },
    {
      name: "series-65-learning-lab",
      icon: '<svg class="pc-icon" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16h16"/><path d="M7 14l3.5-4 3 2.5 5-6"/><path d="M18.5 6.5h-3M18.5 6.5v3"/></svg>',
      title: "Series 65 Learning Lab",
      desc: "An interactive, single-file study system for the NASAA Series 65 exam: 402 flashcards, a 320+ concept hyperlinked glossary, 20+ interactive graphics, and a timed exam simulator. Pure HTML/CSS/JS, zero build step.",
      lang: "HTML",
      tags: ["HTML", "JavaScript", "MathJax"],
      repo: "https://github.com/pierce-lonergan/series-65-learning-lab",
      demo: "https://pierce-lonergan.github.io/series-65-learning-lab/"
    }
  ];

  var grid = $("#projectsGrid");
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function cardHTML(p) {
    var color = LANG_COLORS[p.lang] || "#e07a5c";
    var tags = p.tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
    var demo = p.demo
      ? '<a class="primary" href="' + esc(p.demo) + '" target="_blank" rel="noopener">Live demo ↗</a>'
      : "";
    return '' +
      '<article class="project-card reveal">' +
        '<div class="pc-top">' +
          '<h3 class="pc-title">' + p.icon + esc(p.title) + '</h3>' +
          '<span class="pc-stars" data-repo="' + esc(p.name) + '" hidden>' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
            '<span class="star-count">0</span>' +
          '</span>' +
        '</div>' +
        '<p class="pc-desc">' + esc(p.desc) + '</p>' +
        '<div class="pc-tags">' + tags + '</div>' +
        '<div class="pc-bottom">' +
          '<span class="pc-lang"><span class="lang-dot" style="background:' + color + '"></span>' + esc(p.lang) + '</span>' +
          '<span class="pc-links">' + demo +
            '<a href="' + esc(p.repo) + '" target="_blank" rel="noopener">Code ↗</a>' +
          '</span>' +
        '</div>' +
      '</article>';
  }

  if (grid) {
    grid.innerHTML = PROJECTS.map(cardHTML).join("");
    // Re-observe the freshly injected reveal cards.
    if (!prefersReduced && "IntersectionObserver" in window) {
      var pObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en, i) {
          if (en.isIntersecting) {
            setTimeout(function () { en.target.classList.add("in"); }, Math.min(i * 70, 280));
            obs.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });
      $$(".project-card.reveal", grid).forEach(function (el) { pObs.observe(el); });
    } else {
      $$(".project-card.reveal", grid).forEach(function (el) { el.classList.add("in"); });
    }

    // Progressive enhancement: pull live stars from the public GitHub API.
    fetch("https://api.github.com/users/pierce-lonergan/repos?per_page=100&sort=updated")
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (repos) {
        if (!Array.isArray(repos)) return;
        var byName = {};
        repos.forEach(function (r) { byName[r.name] = r; });
        $$(".pc-stars", grid).forEach(function (el) {
          var data = byName[el.getAttribute("data-repo")];
          if (data && typeof data.stargazers_count === "number" && data.stargazers_count > 0) {
            $(".star-count", el).textContent = data.stargazers_count;
            el.hidden = false;
          }
        });
      })
      .catch(function () { /* offline or rate-limited — static cards stand on their own */ });
  }
})();
