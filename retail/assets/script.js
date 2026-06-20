/* ============================================================
   GT+plastics — Landing Farma · interacciones
   Vanilla JS, sin librerías. Respeta prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Fallbacks de animación ----------
     Si la pestaña se oculta/throttlea, rAF y las transiciones se pausan y una
     animación puede quedar congelada a medias. Registramos "finalizadores" que
     llevan cada animación a su estado final y los disparamos cuando la pestaña
     vuelve a ser visible / recupera foco. */
  var finalizers = [];
  function registerFinalizer(fn) { finalizers.push(fn); }
  function flushFinalizers() {
    for (var i = 0; i < finalizers.length; i++) {
      try { finalizers[i](); } catch (e) { /* noop */ }
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') flushFinalizers();
  });
  window.addEventListener('pageshow', flushFinalizers);
  window.addEventListener('focus', flushFinalizers);

  /* ---------- Año footer ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll (IntersectionObserver) ---------- */
  var reveals = document.querySelectorAll('.reveal, .reveal-img');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var el = entry.target;
          // stagger leve entre hermanos
          var delay = (Array.prototype.indexOf.call(el.parentNode.children, el) % 4) * 70;
          setTimeout(function () { el.classList.add('is-in'); }, delay);
          revObs.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revObs.observe(el); });
    // Fallback: si la pestaña vuelve visible, asegura que ningún reveal quede a medias.
    registerFinalizer(function () {
      reveals.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0 && !el.classList.contains('is-in')) {
          el.classList.add('is-in');
        }
      });
    });
  }

  /* ---------- Count-up de stats y de barras ROI ---------- */
  function formatNum(n, opts) {
    var s;
    if (opts.thousands) {
      s = Math.round(n).toLocaleString('es-MX');
    } else {
      s = String(Math.round(n));
    }
    return (opts.prefix || '') + s + (opts.suffix || '');
  }

  function countOpts(el) {
    return {
      suffix: el.getAttribute('data-suffix') || '',
      prefix: el.getAttribute('data-prefix') || '',
      thousands: el.getAttribute('data-format') === 'thousands'
    };
  }
  function finalizeCount(el) {
    el.textContent = formatNum(parseFloat(el.getAttribute('data-count')), countOpts(el));
    el.dataset.done = '1';
  }
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var opts = countOpts(el);
    if (reduceMotion) { finalizeCount(el); return; }
    var dur = 1400, start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = formatNum(target * eased, opts);
      if (p < 1) requestAnimationFrame(tick);
      else finalizeCount(el);
    }
    requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (!('IntersectionObserver' in window)) {
    counters.forEach(animateCount);
  } else {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); countObs.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countObs.observe(el); });
    // Fallback: al volver visible, fija el valor final de los contadores ya en pantalla.
    registerFinalizer(function () {
      counters.forEach(function (el) {
        if (el.dataset.done === '1') return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) finalizeCount(el);
      });
    });
  }

  /* ---------- Barras ROI (crecen al entrar) ---------- */
  var bars = document.querySelectorAll('.roi-bar__fill');
  function growBars() {
    var max = 250;
    bars.forEach(function (b) {
      var v = parseFloat(b.getAttribute('data-bar'));
      var pct = Math.max((v / max) * 100, 4);
      b.style.width = reduceMotion ? pct + '%' : '0';
      if (!reduceMotion) requestAnimationFrame(function () { b.style.width = pct + '%'; });
      else b.style.width = pct + '%';
    });
  }
  function finalizeBars() {
    var max = 250;
    bars.forEach(function (b) {
      var v = parseFloat(b.getAttribute('data-bar'));
      b.style.width = Math.max((v / max) * 100, 4) + '%';
    });
  }
  var roiSection = document.querySelector('.roi');
  var roiStarted = false;
  if (roiSection && 'IntersectionObserver' in window) {
    var roiObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { growBars(); roiStarted = true; roiObs.unobserve(entry.target); }
      });
    }, { threshold: 0.35 });
    roiObs.observe(roiSection);
    // Fallback: si las barras ya arrancaron, fija su ancho final al volver visible.
    registerFinalizer(function () { if (roiStarted) finalizeBars(); });
  } else { growBars(); }

  /* ---------- Línea de proceso (draw-on-scroll) ---------- */
  var steps = document.querySelector('.steps');
  if (steps && 'IntersectionObserver' in window) {
    var stepObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { steps.classList.add('is-drawn'); stepObs.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    stepObs.observe(steps);
  } else if (steps) { steps.classList.add('is-drawn'); }

  /* ---------- Header: SIEMPRE blanco; solo añade micro-sombra al hacer scroll ---------- */
  var header = document.getElementById('site-header');
  var hero = document.getElementById('hero');
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, { passive: true });
  }

  /* ---------- Sticky CTA: visible tras el hero, oculto en el form ---------- */
  var sticky = document.getElementById('sticky-cta');
  var form = document.getElementById('diagnostico');
  if (sticky) {
    sticky.hidden = false;
    var pastHero = false, atForm = false;
    function syncSticky() { sticky.classList.toggle('is-visible', pastHero && !atForm); }
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        pastHero = !e[0].isIntersecting; syncSticky();
      }, { threshold: 0 }).observe(hero);
    }
    if (form && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        atForm = e[0].isIntersecting; syncSticky();
      }, { threshold: 0.15 }).observe(form);
    }
  }

  /* ---------- Parallax sutil por capas en el hero ---------- */
  var heroBg = document.querySelector('.hero__bg');
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if ((heroBg || parallaxEls.length) && !reduceMotion) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight * 1.3) {
          if (heroBg) heroBg.style.transform = 'translateY(' + (y * 0.08) + 'px)';
          for (var i = 0; i < parallaxEls.length; i++) {
            var f = parseFloat(parallaxEls[i].getAttribute('data-parallax')) || 0;
            parallaxEls[i].style.transform = 'translate3d(0,' + (y * f) + 'px,0)';
          }
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Formulario (placeholder funcional — pendiente HubSpot) ---------- */
  var diagForm = document.getElementById('diagnostico-form');
  var statusEl = document.getElementById('form-status');
  if (diagForm) {
    diagForm.addEventListener('submit', function (e) {
      e.preventDefault();
      diagForm.classList.add('was-submitted');
      statusEl.hidden = false;
      statusEl.className = 'form-status';

      // Validación nativa + mensaje claro
      if (!diagForm.checkValidity()) {
        statusEl.classList.add('is-error');
        statusEl.textContent = 'Por favor completa los campos obligatorios.';
        var firstInvalid = diagForm.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // TODO HubSpot: aquí va el submit real al portal/form de HubSpot.
      // Por ahora se muestra estado de éxito (sin enviar datos a ningún lado).
      statusEl.classList.add('is-success');
      statusEl.innerHTML = '<span class="form-status__check" aria-hidden="true">✓</span>' +
        'Gracias. Recibimos tu solicitud: te contactaremos para agendar tu diagnóstico gratis.';
      diagForm.reset();
      diagForm.classList.remove('was-submitted');
      statusEl.focus && statusEl.focus();
    });
  }
})();
