/* ============================================================
   script.js — Ziad Mohamed portfolio
   Vanilla JS, no dependencies. Handles language switching (EN/AR)
   with persistence, mobile navigation, header scroll state, and
   scroll-based nav highlighting.
   ============================================================ */

'use strict';

(() => {
  const STORAGE_KEY = 'preferredLang';
  const FADE_MS = 180;

  const root = document.documentElement;
  const header = document.getElementById('header');
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  const navLinkItems = navLinks ? navLinks.querySelectorAll('.nav-link') : [];
  const langButtons = document.querySelectorAll('.lang-btn');
  const translatable = document.querySelectorAll('[data-en][data-ar]');
  const contactForm = document.getElementById('contact-form');

  let isSwitchingLang = false;

  /* ----------------------------------------------------------
     Language switching, DOM updates (lang/dir), persistence
     ---------------------------------------------------------- */
  function applyLanguage(lang) {
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    translatable.forEach((el) => {
      const text = lang === 'ar' ? el.dataset.ar : el.dataset.en;
      if (text === undefined) return;

      if (el.tagName === 'META') {
        el.setAttribute('content', text);
      } else {
        el.textContent = text;
      }
    });

    langButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    localStorage.setItem(STORAGE_KEY, lang);
  }

  function switchLanguage(lang) {
    if (isSwitchingLang || root.getAttribute('lang') === lang) return;
    isSwitchingLang = true;

    document.body.style.opacity = '0';

    window.setTimeout(() => {
      applyLanguage(lang);
      document.body.style.opacity = '1';
      isSwitchingLang = false;
    }, FADE_MS);
  }

  langButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
  });

  document.body.style.transition = `opacity ${FADE_MS}ms ease`;

  // Boot: apply a saved preference if there is one. Otherwise the
  // English markup already baked into the HTML is left untouched.
  const savedLang = localStorage.getItem(STORAGE_KEY);
  if (savedLang === 'ar' || savedLang === 'en') {
    applyLanguage(savedLang);
  }

  /* ----------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------- */
  function openMenu() {
    navLinks.classList.add('nav-open');
    menuToggle.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    navLinks.classList.remove('nav-open');
    menuToggle.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.contains('nav-open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Same-page anchor links — close the overlay once one is picked
    navLinkItems.forEach((link) => link.addEventListener('click', closeMenu));

    // Outside click
    document.addEventListener('click', (e) => {
      const isOpen = navLinks.classList.contains('nav-open');
      if (!isOpen) return;
      if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        closeMenu();
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('nav-open')) {
        closeMenu();
      }
    });

    // Don't leave the overlay/scroll-lock stuck if the viewport
    // crosses into the desktop layout (resize or rotation)
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024 && navLinks.classList.contains('nav-open')) {
        closeMenu();
      }
    });
  }

  /* ----------------------------------------------------------
     Header shadow on scroll (drives the .scrolled class from CSS)
     ---------------------------------------------------------- */
  if (header) {
    const updateHeaderShadow = () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', updateHeaderShadow, { passive: true });
    updateHeaderShadow();
  }

  /* ----------------------------------------------------------
     Scroll-spy — keeps the current section's nav link highlighted
     ---------------------------------------------------------- */
  const sections = document.querySelectorAll('main section[id]');
  if (sections.length && navLinkItems.length && 'IntersectionObserver' in window) {
    const linkForSection = (id) =>
      Array.from(navLinkItems).find((link) => link.getAttribute('href') === `#${id}`);

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

  /* ----------------------------------------------------------
     Contact form — prevents the default full-page GET submit
     (the form has no action/method, so without this it reloads
     the page with the fields tacked onto the URL). Wire a real
     endpoint into the TODO below to actually send messages.
     ---------------------------------------------------------- */
  if (contactForm) {
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // TODO: send it somewhere, e.g.
      // fetch('/api/contact', { method: 'POST', body: new FormData(contactForm) });

      if (!submitBtn) return;

      const lang = root.getAttribute('lang') === 'ar' ? 'ar' : 'en';
      const original = submitBtn.textContent;
      submitBtn.textContent = lang === 'ar' ? 'تم الإرسال ✓' : 'Sent ✓';
      submitBtn.disabled = true;

      window.setTimeout(() => {
        submitBtn.textContent = original;
        submitBtn.disabled = false;
        contactForm.reset();
      }, 2200);
    });
  }
})();
