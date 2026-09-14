/* ============================================================
   script.js — Ziad Mohamed portfolio
   Vanilla JS, zero dependencies. Enhances index.html + style.css
   without breaking anything if it fails to run (progressive
   enhancement): the AR/EN text swap, the :target lightbox and
   the smooth-scroll menu remain usable even with JS disabled.

   Modules
     0. Utilities & injected enhancement styles (toast, reveal)
     1. Language switcher (EN ⇄ AR) with localStorage persistence
     2. Mobile navigation (hamburger) — fully wired even though
        the shipped layout keeps links always inline
     3. Header scroll state + scroll-spy (active nav link)
     4. Scroll-reveal via IntersectionObserver (staggered)
     5. Project lightbox: open / close / prev-next / scroll lock
     6. Copy-to-clipboard (email & location) + toast feedback
     7. Contact form demo submit feedback
   ============================================================ */

'use strict';

(() => {
  /* ---------------------------------------------------------
     0. Utilities & injected enhancement styles
     --------------------------------------------------------- */
  const STORAGE_KEY = 'preferredLang';
  const FADE_MS = 180;
  const TOAST_MS = 1900;
  const NAV_BREAKPOINT = 1024;

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const i18n = {
    copied:     { en: 'Copied to clipboard!', ar: 'تم النسخ إلى الحافظة!' },
    copyFailed: { en: 'Copy failed',          ar: 'تعذّر النسخ' },
    sent:       { en: 'Sent ✓',               ar: 'تم الإرسال ✓' },
  };
  const lang = () => (root.getAttribute('lang') === 'ar' ? 'ar' : 'en');

  const header = $('#header');
  const menuToggle = $('#menu-toggle');
  const navLinks = $('#nav-links');
  const navLinkItems = navLinks ? $$('.nav-link', navLinks) : [];
  const langButtons = $$('.lang-btn');
  const translatable = $$('[data-en][data-ar]');
  const contactForm = $('#contact-form');

  /* Enhancement styles live here so the JS feature set is
     self-contained; they reuse the design tokens from style.css. */
  const injectStyles = () => {
    const style = document.createElement('style');
    style.id = 'js-enhancements';
    style.textContent = `
      /* — scroll reveal (armed only once JS is confirmed ready) — */
      html.js-reveal .reveal:not(.revealed) {
        opacity: 0;
        transform: translateY(22px);
      }
      html.js-reveal .reveal.revealed {
        opacity: 1;
        transform: translateY(0);
        transition:
          opacity 520ms ease var(--reveal-delay, 0ms),
          transform 520ms cubic-bezier(0.2, 0.8, 0.3, 1) var(--reveal-delay, 0ms);
      }
      @media (prefers-reduced-motion: reduce) {
        html.js-reveal .reveal,
        html.js-reveal .reveal.revealed { opacity: 1; transform: none; transition: none; }
      }

      /* — toast — */
      .js-toast {
        position: fixed;
        inset-block-end: clamp(16px, 4vh, 32px);
        inset-inline-start: 50%;
        transform: translate(-50%, 14px);
        z-index: 300;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: min(92vw, 480px);
        padding: 10px 18px;
        border: 1px solid var(--color-border-strong, #2E4560);
        border-radius: 10px;
        background: rgba(13, 25, 38, 0.92);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 18px rgba(224, 149, 74, 0.14);
        color: var(--color-text, #E9EEF5);
        font-family: 'JetBrains Mono', 'Tajawal', ui-monospace, monospace;
        font-size: 0.8125rem;
        line-height: 1.4;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 220ms ease, transform 220ms ease, visibility 220ms;
      }
      .js-toast.show {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, 0);
      }
      .js-toast i { color: var(--color-accent, #E0954A); flex-shrink: 0; }

      /* — copied pulse on the clicked contact item — */
      @keyframes js-copied-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(224, 149, 74, 0.45); }
        100% { box-shadow: 0 0 0 14px rgba(224, 149, 74, 0); }
      }
      .contact-item.copied-pulse { animation: js-copied-pulse 450ms ease-out; }
    `;
    document.head.appendChild(style);
  };

  /* ---------------------------------------------------------
     1. Language switcher (EN ⇄ AR)
     Swaps [data-en]/[data-ar] leaf-node text, flips lang/dir,
     syncs the toggle buttons (class + aria-pressed) and keeps
     the choice in localStorage.
     --------------------------------------------------------- */
  let isSwitchingLang = false;

  const applyLanguage = (next) => {
    root.setAttribute('lang', next);
    root.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');

    translatable.forEach((el) => {
      const text = next === 'ar' ? el.dataset.ar : el.dataset.en;
      if (text === undefined) return;
      if (el.tagName === 'META') el.setAttribute('content', text);
      else el.textContent = text;
    });

    langButtons.forEach((btn) => {
      const isActive = btn.dataset.lang === next;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    try { localStorage.setItem(STORAGE_KEY, next); } catch (err) { /* private mode */ }
  };

  const switchLanguage = (next) => {
    if (isSwitchingLang || lang() === next) return;
    isSwitchingLang = true;

    if (prefersReducedMotion.matches) {
      applyLanguage(next);
      isSwitchingLang = false;
      return;
    }

    document.body.style.transition = `opacity ${FADE_MS}ms ease`;
    document.body.style.opacity = '0';
    window.setTimeout(() => {
      applyLanguage(next);
      document.body.style.opacity = '1';
      isSwitchingLang = false;
    }, FADE_MS);
  };

  langButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
  });

  /* ---------------------------------------------------------
     2. Mobile navigation
     The shipped layout keeps links always inline (the toggle is
     display:none), but the full open/close behavior stays wired
     so it works if a breakpoint or CSS variant ever shows it.
     --------------------------------------------------------- */
  const openMenu = () => {
    navLinks.classList.add('nav-open');
    menuToggle.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  };

  const closeMenu = () => {
    navLinks.classList.remove('nav-open');
    menuToggle.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  const isMenuOpen = () => navLinks.classList.contains('nav-open');
  const menuApi = menuToggle && navLinks ? { openMenu, closeMenu, isMenuOpen } : null;

  if (menuApi) {
    menuToggle.addEventListener('click', () =>
      menuApi.isMenuOpen() ? menuApi.closeMenu() : menuApi.openMenu()
    );
    navLinkItems.forEach((link) => link.addEventListener('click', menuApi.closeMenu));
    window.addEventListener('resize', () => {
      if (window.innerWidth >= NAV_BREAKPOINT && menuApi.isMenuOpen()) menuApi.closeMenu();
    });
  }

  /* ---------------------------------------------------------
     3. Header scroll state + scroll-spy (current section)
     --------------------------------------------------------- */
  if (header) {
    const updateHeaderShadow = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', updateHeaderShadow, { passive: true });
    updateHeaderShadow();
  }

  const sections = $$('main section[id]');
  const linkForSection = (id) =>
    navLinkItems.find((link) => link.getAttribute('href') === `#${id}`);

  if (sections.length && navLinkItems.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const activeLink = linkForSection(entry.target.id);
          if (!activeLink) return;
          navLinkItems.forEach((link) => link.classList.remove('active'));
          activeLink.classList.add('active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));
  }

  /* ---------------------------------------------------------
     4. Scroll-reveal — fade + slide sections/cards into view.
     Elements already in the first viewport are never hidden, so
     there is no load-time flash; below-the-fold siblings reveal
     once each with a light stagger.
     --------------------------------------------------------- */
  const initReveal = () => {
    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) return;

    const targets = $$(
      [
        'main > section:not(.hero) .section-title',
        'main > section:not(.hero) .about-text',
        'main > section:not(.hero) .about-info',
        'main > section:not(.hero) .skill-category',
        'main > section:not(.hero) .project-card',
        'main > section:not(.hero) .timeline-item',
        'main > section:not(.hero) .contact-lead',
        'main > section:not(.hero) .contact-item',
        'main > section:not(.hero) .contact-form',
      ].join(', ')
    );
    if (!targets.length) return;

    const vh = window.innerHeight || root.clientHeight;
    const pending = [];

    targets.forEach((el) => {
      el.classList.add('reveal');
      if (el.getBoundingClientRect().top < vh * 0.92) {
        el.classList.add('revealed');            // already on screen → leave visible
      } else {
        pending.push(el);
      }
    });
    if (!pending.length) return;

    root.classList.add('js-reveal');             // hide only .reveal:not(.revealed)

    pending.forEach((el) => {
      const siblings = $$('.reveal', el.parentElement);
      const i = Math.max(0, siblings.indexOf(el));
      el.style.setProperty('--reveal-delay', `${Math.min(i * 70, 420)}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add('revealed');
          io.unobserve(el);
          el.addEventListener('transitionend', () => el.style.removeProperty('--reveal-delay'), { once: true });
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    pending.forEach((el) => io.observe(el));
  };

  /* ---------------------------------------------------------
     5. Project lightbox (MechaTech photos)
     Visibility is owned by the CSS `:target` rule, so the
     overlay also works with JS disabled. With JS we upgrade the
     experience: no scroll jump on open, smooth close (real hash
     nav with snap scroll restore — pushState does not re-run
     :target in Chromium), backdrop/× close, Escape, ←/→ to flip
     images, body scroll-lock (with scrollbar compensation),
     focus management and a minimal focus trap.
     --------------------------------------------------------- */
  const triggers = $$('.lightbox-trigger');
  const lightboxIds = triggers
    .map((tr) => (tr.getAttribute('href') || '').replace(/^#/, ''))
    .filter((id) => document.getElementById(id));

  let lastFocusedTrigger = null;
  let scrollLockPadApplied = false;

  const lightboxOpen = () => /^#lightbox-/.test(window.location.hash);
  const currentLightbox = () => $('.lightbox:target');

  const lockScroll = () => {
    if (scrollLockPadApplied || document.body.style.overflow === 'hidden') return;
    const pad = window.innerWidth - root.clientWidth;
    if (pad > 0) {
      document.body.style.paddingInlineEnd = `${pad}px`;
      scrollLockPadApplied = true;
    }
    document.body.style.overflow = 'hidden';
  };

  const unlockScroll = () => {
    document.body.style.overflow = '';
    if (scrollLockPadApplied) document.body.style.paddingInlineEnd = '';
    scrollLockPadApplied = false;
  };

  const focusWithRetry = (el) => {
    /* .focus() can be dropped while the overlay flips through its
       visibility transition. Retry — but only while focus sits on
       <body>, so we never steal it once the user moved elsewhere. */
    if (!el) return;
    el.focus({ preventScroll: true });
    const retry = () => {
      const ae = document.activeElement;
      if ((ae === document.body || ae === root) && document.contains(el)) {
        el.focus({ preventScroll: true });
      }
    };
    requestAnimationFrame(retry);
    window.setTimeout(retry, 320);
  };

  const syncLightboxState = () => {
    if (lightboxOpen()) {
      lockScroll();
      const lb = currentLightbox();
      if (lb) {
        void lb.offsetWidth;           // force :target style recalc before focus()
        focusWithRetry(lb);
      }
    } else {
      unlockScroll();
      if (lastFocusedTrigger && document.contains(lastFocusedTrigger)) {
        focusWithRetry(lastFocusedTrigger);
        lastFocusedTrigger = null;
      }
    }
  };

  /* Real hash navigation (not pushState): Chromium only re-evaluates
     :target on actual navigations. Scroll position is snap-restored in
     the same task so the anchor jump is never painted. */
  const closeLightbox = () => {
    if (!lightboxOpen()) return;
    const y = window.scrollY;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.location.hash = '#projects';
    window.scrollTo(0, y);
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      root.style.scrollBehavior = prevBehavior;
      syncLightboxState();
    });
    syncLightboxState();
  };

  if (lightboxIds.length) {
    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let browser navigate
        e.preventDefault();
        lastFocusedTrigger = trigger;
        const id = (trigger.getAttribute('href') || '').replace(/^#/, '');
        if (window.location.hash === `#${id}`) syncLightboxState();
        else window.location.hash = id;            // fires hashchange → sync
      });
    });

    $$('.lightbox-close, .lightbox-backdrop').forEach((closer) =>
      closer.addEventListener('click', (e) => {
        e.preventDefault();
        closeLightbox();
      })
    );

    window.addEventListener('hashchange', syncLightboxState);   // manual Back / Forward
    window.addEventListener('popstate', syncLightboxState);

    window.addEventListener('keydown', (e) => {
      /* — lightbox shortcuts first (capture phase runs before the
         tiny inline Escape fallback in index.html, so it never
         double-handles or jumps the scroll) — */
      if (lightboxOpen()) {
        const idx = lightboxIds.indexOf(window.location.hash.slice(1));

      if (e.key === 'Escape') {
          e.preventDefault();
          closeLightbox();
          return;
        }
        if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && lightboxIds.length > 1) {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          window.location.hash = lightboxIds[(idx + dir + lightboxIds.length) % lightboxIds.length];
          return;
        }
        if (e.key === 'Tab') {
          const lb = currentLightbox();
          const focusables = lb
            ? $$('a[href], button, [tabindex]:not([tabindex="-1"])', lb)
            : [];
          if (focusables.length) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && (document.activeElement === first || !lb.contains(document.activeElement))) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
          return;
        }
      }

      /* — menu: Escape also closes the drawer if one is open — */
      if (menuApi && menuApi.isMenuOpen() && e.key === 'Escape') menuApi.closeMenu();
    }, { capture: true });

    if (menuApi) {
      document.addEventListener('click', (e) => {
        if (!menuApi.isMenuOpen()) return;
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) menuApi.closeMenu();
      });
    }
  }

  /* Menu Escape/outside-click also when there are no triggers (defensive) */
  if (menuApi && !lightboxIds.length) {
    document.addEventListener('click', (e) => {
      if (menuApi.isMenuOpen() && !navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        menuApi.closeMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuApi.isMenuOpen()) menuApi.closeMenu();
    });
  }

  /* ---------------------------------------------------------
     6. Copy-to-clipboard + toast
     • mailto contact item: plain click copies the address
       (Ctrl/Cmd/middle-click still opens the mail client)
     • non-link contact items (Location): click copies too
     • external links (LinkedIn / GitHub) are left untouched
     --------------------------------------------------------- */
  let toastEl = null;
  let toastTimer = 0;

  const toast = (message) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'js-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      toastEl.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span class="js-toast-msg"></span>';
      document.body.appendChild(toastEl);
    }
    $('.js-toast-msg', toastEl).textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), TOAST_MS);
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;inset-inline-start:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return Promise.resolve(ok);
  };

  const copyText = (text) =>
    navigator.clipboard && window.isSecureContext
      ? navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text))
      : fallbackCopy(text);

  const bindCopy = () => {
    $$('.contact-info .contact-item').forEach((item) => {
      const valueEl = $('.contact-value', item);
      if (!valueEl) return;
      const text = valueEl.textContent.trim();
      const href = item.href || '';
      const isMail = href.startsWith('mailto:');
      if (href && !isMail) return;                     // external link: leave as-is

      item.title = text;
      if (isMail || !item.href) item.style.cursor = 'copy';

      item.addEventListener('click', (e) => {
        if (isMail && (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0)) return;
        if (isMail) e.preventDefault();
        copyText(text).then((ok) => {
          if (!ok) { toast(i18n.copyFailed[lang()]); return; }
          toast(`${i18n.copied[lang()]}  ·  ${text}`);
          item.classList.remove('copied-pulse');
          void item.offsetWidth;                        // restart the pulse
          item.classList.add('copied-pulse');
        });
      });
    });
  };

  /* ---------------------------------------------------------
     7. Contact form — demo submit feedback
     (no endpoint wired yet; replace the TODO with a fetch)
     --------------------------------------------------------- */
  if (contactForm) {
    const submitBtn = $('button[type="submit"]', contactForm);

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!submitBtn) return;
      const original = submitBtn.textContent;
      submitBtn.textContent = i18n.sent[lang()];
      submitBtn.disabled = true;
      window.setTimeout(() => {
        submitBtn.textContent = original;
        submitBtn.disabled = false;
        contactForm.reset();
      }, 2200);

      // TODO: wire a real endpoint, e.g.
      // fetch('/api/contact', { method: 'POST', body: new FormData(contactForm) });
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  injectStyles();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') applyLanguage(saved);
  } catch (err) { /* storage blocked (private mode) — default EN is fine */ }

  initReveal();
  bindCopy();
})();