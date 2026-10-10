/* OJAS SOLAR — main.js
   Vanilla JS + GSAP 3 + ScrollTrigger + Lenis.
   All editable content lives in CONFIG below. */
(() => {
  'use strict';

  /* ======================= CONFIG — EDIT HERE ======================= */
  const CONFIG = {
    whatsapp: '919825084721',
    waMessage: 'Hello Ojas Solar, I would like to schedule a free rooftop solar site survey for my property in Saurashtra.',
    phone: '+919825084721',
    phoneDisplay: '+91 98250 84721',
    email: 'contact@ojassolar.com',
    FORM_ENDPOINT: '', // Can be connected to Formspree, Apps Script, or webhook
    stats: { mw: 28, projects: 190, warranty: 25, reduction: 85 },
    // Calculator constants (calibrated for Gujarat solar irradiance)
    calc: {
      UNITS_PER_KW_PER_MONTH: 125, // kWh generated per kWp per month in Saurashtra
      TARIFF: 8.2,                 // ₹ per unit (avg commercial/industrial tariff in Gujarat)
      ROOF_SQFT_PER_KWP: 85,       // roof area needed per kWp (high-efficiency Bifacial panels)
      MAX_BILL_OFFSET: 0.88        // fixed charges remain, so saving is capped
    }
  };
  /* ================================================================== */

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const html = document.documentElement;
  const nf = new Intl.NumberFormat('en-IN');
  let introDelay = 0;

  /* ---------- config → DOM ---------- */
  function applyConfig() {
    const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.waMessage)}`;
    $$('[data-wa]').forEach(a => (a.href = wa));
    $$('[data-phone]').forEach(a => { a.href = 'tel:' + CONFIG.phone.replace(/\s/g, ''); a.textContent = CONFIG.phoneDisplay; });
    $$('[data-email]').forEach(a => { a.href = 'mailto:' + CONFIG.email; a.textContent = CONFIG.email; });
    $$('[data-stat]').forEach(el => {
      const v = CONFIG.stats[el.dataset.stat];
      if (typeof v === 'number') { el.dataset.count = v; el.textContent = '0' + (el.dataset.suffix || ''); }
      else el.textContent = el.dataset.ph;
    });
  }

  /* ---------- live clock (IST) ---------- */
  function clock() {
    const el = $('#clock'); if (!el) return;
    const tick = () => {
      el.textContent = 'IST ' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- dial ticks ---------- */
  function buildDial() {
    const svg = $('#dial'); if (!svg) return;
    let s = '';
    for (let i = 0; i < 72; i++) {
      const long = i % 6 === 0, a = (i * 5 * Math.PI) / 180, r1 = long ? 90 : 94, r2 = 99;
      s += `<line x1="${100 + r1 * Math.cos(a)}" y1="${100 + r1 * Math.sin(a)}" x2="${100 + r2 * Math.cos(a)}" y2="${100 + r2 * Math.sin(a)}" stroke="currentColor" stroke-width="${long ? 1 : 0.5}"/>`;
    }
    svg.innerHTML = `<g>${s}</g>`;
  }

  /* ---------- wordmark fit: edge to edge ---------- */
  function fitWordmarks() {
    $$('.wm').forEach(wm => {
      const words = $$('.fit-w', wm);
      const W = wm.parentElement.clientWidth - (wm.closest('.wrap') ? parseFloat(getComputedStyle(wm.closest('.wrap')).paddingInline) * 2 : 0);
      if (!W || !words.length) return;
      words.forEach(w => (w.style.fontSize = ''));
      wm.style.fontSize = '100px';
      if (innerWidth < 768) {
        wm.style.fontSize = '';
        words.forEach(w => {
          w.style.fontSize = '100px';
          w.style.fontSize = (100 * W / w.getBoundingClientRect().width) + 'px';
        });
      } else {
        const a = words[0].getBoundingClientRect(), b = words[words.length - 1].getBoundingClientRect();
        wm.style.fontSize = (100 * W / (b.right - a.left)) + 'px';
      }
    });
  }

  /* ---------- word-mask split ---------- */
  function splitWords(el) {
    const t = el.textContent.trim();
    el.setAttribute('aria-label', t);
    el.textContent = '';
    t.split(/\s+/).forEach((w, i, arr) => {
      const o = document.createElement('span'); o.className = 'mw'; o.setAttribute('aria-hidden', 'true');
      const n = document.createElement('span'); n.className = 'mi'; n.textContent = w;
      o.appendChild(n); el.appendChild(o);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  /* ---------- language toggle ---------- */
  function initLang() {
    $$('[data-gu]').forEach(el => (el.dataset.en = el.textContent.trim()));
    const btn = $('#lang');
    btn.addEventListener('click', () => {
      const gu = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', gu);
      btn.setAttribute('aria-label', gu ? 'Switch language to English' : 'Switch language to Gujarati');
      html.lang = gu ? 'gu' : 'en';
      $$('[data-gu]').forEach(el => {
        const txt = gu ? el.dataset.gu : el.dataset.en;
        if (el.classList.contains('split') && !reduce) {
          el.textContent = txt; splitWords(el);
          if (el.dataset.in) hasGSAP && gsap.set($$('.mi', el), { yPercent: 0 });
          else hasGSAP && gsap.set($$('.mi', el), { yPercent: 110 });
        } else if (el.closest('.menu nav')) {
          const sp = $('span', el); el.textContent = ''; if (sp) el.appendChild(sp); el.appendChild(document.createTextNode(txt));
        } else el.textContent = txt;
      });
    });
  }

  /* ---------- accordions ---------- */
  function initAccordions() {
    $$('.svc-btn').forEach(b => {
      b.addEventListener('click', () => {
        const open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', String(!open));
        b.closest('.svc').classList.toggle('open', !open);
      });
    });
  }

  /* ---------- menu overlay (keyboard-safe) ---------- */
  let lenis = null;
  function initMenu() {
    const btn = $('#menuBtn'), menu = $('#menu');
    const focusables = () => $$('a, button', menu);
    const set = open => {
      menu.classList.toggle('open', open);
      menu.inert = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open) focusables()[0]?.focus(); else btn.focus();
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', e => {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') set(false);
      if (e.key === 'Tab') {
        const f = [btn, ...focusables()], i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }

  /* ---------- anchors ---------- */
  function initAnchors() {
    $$('a[href^="#"]').forEach(a => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      a.addEventListener('click', e => {
        const t = $(id); if (!t) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: -56 }); else t.scrollIntoView();
        try { history.replaceState(null, '', id); } catch (_) {}
      });
    });
    // city links preselect the form city
    $$('[data-city]').forEach(a => a.addEventListener('click', () => { 
      const fc = $('#f-city');
      if (fc) fc.value = a.dataset.city; 
    }));
  }

  /* ---------- calculator ---------- */
  function initCalc() {
    const bill = $('#c-bill'), roof = $('#c-roof'), type = $('#c-type');
    const kwp = $('#o-kwp'), save = $('#o-save'), note = $('#o-note');
    const annualEl = $('#o-annual'), co2El = $('#o-co2'), paybackEl = $('#o-payback');
    const C = CONFIG.calc;
    
    const run = () => {
      const b = parseFloat(bill.value);
      if (!(b > 0)) { 
        kwp.textContent = '—'; 
        save.textContent = '—'; 
        if (annualEl) annualEl.textContent = '—';
        if (co2El) co2El.textContent = '—';
        if (paybackEl) paybackEl.textContent = '—';
        note.textContent = 'Enter your monthly bill or pick a preset above.'; 
        return; 
      }
      
      const needed = b / C.TARIFF / C.UNITS_PER_KW_PER_MONTH;
      const r = parseFloat(roof.value);
      const cap = r > 0 ? r / C.ROOF_SQFT_PER_KWP : Infinity;
      const size = Math.min(needed, cap);
      const monthlySaving = Math.min(size * C.UNITS_PER_KW_PER_MONTH * C.TARIFF, b * C.MAX_BILL_OFFSET);
      const annualSaving = monthlySaving * 12;
      const annualGenerationKwh = size * C.UNITS_PER_KW_PER_MONTH * 12;
      const co2Tons = (annualGenerationKwh * 0.82) / 1000; // ~0.82 kg CO2 per kWh in India
      const estSystemCost = size * 46000; // indicative ₹46k/kWp installed
      const estPaybackYears = Math.max(2.8, Math.min(5.5, estSystemCost / Math.max(annualSaving, 1)));

      kwp.textContent = size < 10 ? size.toFixed(1) : nf.format(Math.round(size));
      save.textContent = '₹' + nf.format(Math.round(monthlySaving / 100) * 100) + ' / mo';
      if (annualEl) annualEl.textContent = '₹' + nf.format(Math.round(annualSaving / 1000) * 1000) + ' / yr';
      if (co2El) co2El.textContent = co2Tons.toFixed(1) + ' T/yr';
      if (paybackEl) paybackEl.textContent = '~' + estPaybackYears.toFixed(1) + ' Yrs';

      note.textContent = size < needed ? 'Roof area limits the system size. Indicative estimate; final design after 3D drone site survey.'
        : 'Indicative estimate based on Saurashtra solar yield. Final quote after free site survey.';
    };

    [bill, roof, type].forEach(el => el && el.addEventListener('input', run));
    
    // Quick preset buttons
    $$('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        bill.value = btn.dataset.preset;
        if (btn.dataset.type && type) type.value = btn.dataset.type;
        run();
      });
    });

    // Run initial calculation
    if (bill && bill.value) run();
  }

  /* ---------- lead form ---------- */
  function initForm() {
    const f = $('#lead'), status = $('#f-status');
    const rules = {
      'f-name': v => (v.trim().length > 1 ? '' : 'Enter your name.'),
      'f-phone': v => (/^(\+91|0)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit mobile number.'),
      'f-city': v => (v ? '' : 'Select a city.'),
      'f-prop': v => (v ? '' : 'Select a property type.')
    };

    f.addEventListener('submit', async e => {
      e.preventDefault();
      let first = null;
      Object.entries(rules).forEach(([id, fn]) => {
        const el = $('#' + id), msg = fn(el.value), err = $('#e-' + id.slice(2));
        if (err) err.textContent = msg; 
        if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
        if (msg && !first) first = el;
      });
      if (first) { first.focus(); return; }
      
      const name = $('#f-name').value.trim();
      const phone = $('#f-phone').value.trim();
      const city = $('#f-city').value;
      const prop = $('#f-prop').value;
      const bill = $('#f-bill').value || 'Not specified';
      const msg = $('#f-msg') ? $('#f-msg').value.trim() : '';

      status.className = 'status mono'; status.textContent = 'Processing your survey request…';
      
      const waText = `*Free Site Survey Request - Ojas Solar*%0A*Name:* ${encodeURIComponent(name)}%0A*Phone:* ${encodeURIComponent(phone)}%0A*City:* ${encodeURIComponent(city)}%0A*Property:* ${encodeURIComponent(prop)}%0A*Monthly Bill:* ₹${encodeURIComponent(bill)}${msg ? '%0A*Note:* ' + encodeURIComponent(msg) : ''}`;
      const waUrl = `https://wa.me/${CONFIG.whatsapp}?text=${waText}`;

      if (!CONFIG.FORM_ENDPOINT || /REPLACE/.test(CONFIG.FORM_ENDPOINT)) {
        status.className = 'status mono ok';
        status.innerHTML = `Request logged! We will call you within 24 hours. <br><a class="btn btn-solar btn-sm" style="margin-top:10px; display:inline-flex;" href="${waUrl}" target="_blank" rel="noopener">Or Instant Send on WhatsApp →</a>`;
        return;
      }

      try {
        const res = await fetch(CONFIG.FORM_ENDPOINT, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        status.className = 'status mono ok'; status.textContent = 'Received. Our technical survey crew will contact you within one working day.';
        f.reset();
      } catch (_) {
        status.className = 'status mono ok'; 
        status.innerHTML = `Request ready! Connect directly via WhatsApp: <a class="btn btn-solar btn-sm" style="margin-top:8px; display:inline-flex;" href="${waUrl}" target="_blank" rel="noopener">Confirm on WhatsApp →</a>`;
      }
    });
  }

  /* ======================= MOTION ======================= */
  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);

    // Lenis smooth scroll
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // heading splits (done once; reveals live in matchMedia)
    $$('.split').forEach(el => { splitWords(el); gsap.set($$('.mi', el), { yPercent: 110 }); });

    const mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 1024px)', mob: '(max-width: 1023px)' }, ctx => {
      const desk = ctx.conditions.desk, k = desk ? 1 : 0.5;

      // line-mask reveals
      $$('.split').forEach(el => {
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: () => {
            el.dataset.in = '1';
            gsap.to($$('.mi', el), { yPercent: 0, duration: 1, stagger: 0.06, ease: 'power4.out', delay: el.closest('#hero') ? introDelay : 0 });
          }
        });
      });

      // parallax via data-speed
      $$('[data-speed]').forEach(el => {
        const s = parseFloat(el.dataset.speed) * k, host = el.closest('section') || el.parentElement;
        gsap.fromTo(el, { y: -s * 300 }, { y: s * 300, ease: 'none', scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      // image reveals
      $$('.reveal-img').forEach(el => {
        const inner = $('.ph-in, img', el);
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', once: true }, delay: el.closest('#hero') ? introDelay : 0 });
        tl.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.1, ease: 'power4.out' });
        if (inner) tl.fromTo(inner, { scale: 1.25 }, { scale: 1, duration: 1.4, ease: 'power3.out' }, 0);
      });

      // dial rotation tied to scroll
      gsap.to('#dial', { rotation: 120, ease: 'none', transformOrigin: '50% 50%', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

      // manifesto: grey → ink, scrubbed
      const mf = $('#mf');
      if (mf) {
        const words = mf.textContent.trim().split(/\s+/);
        mf.setAttribute('aria-label', mf.textContent.trim());
        mf.innerHTML = words.map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
        const ws = $$('.w', mf);
        gsap.fromTo(ws, { color: '#8A8880' }, {
          color: '#0B0B0B', stagger: 0.1, ease: 'none',
          scrollTrigger: { trigger: '#manifesto', start: 'top 70%', end: desk ? '+=90%' : 'bottom 55%', scrub: true, pin: desk ? '#manifesto' : false }
        });
      }

      // count-up
      $$('[data-count]').forEach(el => {
        const end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '', o = { v: 0 };
        ScrollTrigger.create({
          trigger: el, start: 'top 80%', once: true,
          onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = nf.format(Math.round(o.v)) + suf) })
        });
      });

      // marquees: infinite, direction follows scroll
      $$('.marquee').forEach(m => {
        const tr = $('.m-track', m);
        if (!tr.dataset.dup) { tr.innerHTML = tr.innerHTML.repeat(4); tr.dataset.dup = '1'; }
        const tw = gsap.to(tr, { xPercent: -50, ease: 'none', duration: desk ? 30 : 20, repeat: -1 });
        ScrollTrigger.create({ onUpdate: s => tw.timeScale(s.direction) });
      });

      // Sticky cards stacking scroll effect
      const stickyCards = $$('.sticky-card');
      if (stickyCards.length > 1) {
        stickyCards.forEach((card, index) => {
          if (index === stickyCards.length - 1) return;
          const nextCard = stickyCards[index + 1];
          gsap.to(card, {
            scale: 0.94 - index * 0.015,
            filter: 'brightness(0.8)',
            ease: 'none',
            scrollTrigger: {
              trigger: nextCard,
              start: 'top 85%',
              end: 'top 25%',
              scrub: true
            }
          });
        });
      }

      // Client sliders (track 1 moving left, track 2 moving right)
      const s1Track = $('.slider .slide-track');
      const s2Track = $('.slider2 .slide-track');
      if (s1Track && !s1Track.dataset.dup) {
        s1Track.innerHTML += s1Track.innerHTML;
        s1Track.dataset.dup = '1';
        const tw1 = gsap.to(s1Track, { xPercent: -50, ease: 'none', duration: 24, repeat: -1 });
        ScrollTrigger.create({ onUpdate: s => tw1.timeScale(s.direction || 1) });
      }
      if (s2Track && !s2Track.dataset.dup) {
        s2Track.innerHTML += s2Track.innerHTML;
        s2Track.dataset.dup = '1';
        gsap.set(s2Track, { xPercent: -50 });
        const tw2 = gsap.to(s2Track, { xPercent: 0, ease: 'none', duration: 28, repeat: -1 });
        ScrollTrigger.create({ onUpdate: s => tw2.timeScale(s.direction || 1) });
      }

      // process: horizontal pin on desktop only
      if (desk) {
        const track = $('.p-track'), bar = $('.p-bar i');
        const dist = () => track.scrollWidth - innerWidth;
        gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#process', pin: true, scrub: 1, start: 'top top', end: () => '+=' + dist(), invalidateOnRefresh: true } });
        gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#process', start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });
      }

      // square cursor, desktop pointer only
      if (desk && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const cur = document.createElement('div'); cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true'); document.body.appendChild(cur);
        const xt = gsap.quickTo(cur, 'x', { duration: 0.2 }), yt = gsap.quickTo(cur, 'y', { duration: 0.2 });
        const move = e => { xt(e.clientX); yt(e.clientY); };
        const over = e => { const on = e.target.closest('[data-cursor]'); cur.classList.toggle('grow', !!on); cur.textContent = on ? 'VIEW' : ''; };
        addEventListener('mousemove', move); addEventListener('mouseover', over);
        return () => { removeEventListener('mousemove', move); removeEventListener('mouseover', over); cur.remove(); };
      }
    });

    const refresh = () => { fitWordmarks(); ScrollTrigger.refresh(); };
    document.fonts && document.fonts.ready.then(refresh);
    addEventListener('load', refresh);
  }

  /* ---------- preloader ---------- */
  function preloader(done) {
    const pre = $('#pre');
    if (!pre || !html.classList.contains('anim') || !hasGSAP) { pre && pre.remove(); done(); return; }
    const cnt = $('#cnt'), o = { v: 0 };
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      gsap.to(pre, { yPercent: -100, duration: 0.7, ease: 'power4.inOut', onComplete: () => pre.remove() });
      introDelay = 0.35; done();
    };
    gsap.to(o, { v: 100, duration: 0.9, ease: 'power1.inOut', onUpdate: () => (cnt.textContent = String(Math.round(o.v)).padStart(3, '0')), onComplete: finish });
    ['click', 'keydown'].forEach(ev => pre.addEventListener(ev, finish, { once: true }));
    addEventListener('keydown', finish, { once: true });
  }

  /* ======================= INIT ======================= */
  function init() {
    applyConfig(); clock(); buildDial(); initLang(); initAccordions(); initMenu(); initAnchors(); initCalc(); initForm();
    $('#toTop')?.addEventListener('click', e => { e.preventDefault(); lenis ? lenis.scrollTo(0) : scrollTo(0, 0); });
    fitWordmarks();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fitWordmarks, 120); });

    if (!hasGSAP || reduce) {
      // static fallback: no motion, everything visible
      html.classList.remove('anim'); html.classList.add('reduce');
      $('#pre')?.remove();
      $$('[data-count]').forEach(el => (el.textContent = nf.format(+el.dataset.count) + (el.dataset.suffix || '')));
      return;
    }
    preloader(() => {});
    initMotion();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
