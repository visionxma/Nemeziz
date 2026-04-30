// Helper: run a block, log error but never break the rest of the script
const safe = (label, fn) => { try { fn(); } catch (e) { console.warn('[' + label + ']', e); } };

// ============ DISABLE ZOOM (mobile + desktop) ============
safe('zoom', () => {
  // iOS gesture events (Safari)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
    document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
  });

  // Pinch-to-zoom via touch
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  // Double-tap to zoom (iOS)
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 320) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // Ctrl/Cmd + scroll zoom (desktop)
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  // Ctrl/Cmd + +/-/0 keyboard zoom (desktop)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
      e.preventDefault();
    }
  });
});

// ============ BELL SOUND (Web Audio) ============
const bell = (() => {
  let ctx = null;
  let unlocked = false;

  // Init on first user interaction (browsers block autoplay)
  const unlock = () => {
    if (unlocked) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      unlocked = true;
    } catch (e) { /* no audio support */ }
  };
  ['click', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
    window.addEventListener(evt, unlock, { once: true, passive: true })
  );

  // Synthesize a short, pleasant 2-tone bell chime
  const play = () => {
    if (!unlocked || !ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);

    const ring = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(1, now + start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain).connect(master);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    };

    // Two-note chime: C6 then E6
    ring(1046.5, 0.00, 0.45);
    ring(1318.5, 0.08, 0.55);
  };

  return { play };
})();

// ============ LIVE NOTIFICATIONS (lightweight) ============
safe('notif', () => {
  const list = document.querySelector('.notif-right');
  if (!list) return;

  const events = [
    { type: 'CPA aprovado!', house: 'Blaze', value: 240.00 },
    { type: 'Novo FTD registrado', house: 'JonBet', value: 180.00 },
    { type: 'Saque liberado', house: 'Pix', value: 1420.00 },
    { type: 'Comissão recebida', house: 'Blaze', value: 320.50 },
    { type: 'CPA aprovado!', house: 'JonBet', value: 195.00 },
  ];

  const fmtBRL = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cardHTML = (ev) => `
    <div class="notif-ico"><img src="assets/SIM1@2x.webp" alt=""/></div>
    <div class="notif-body">
      <strong>${ev.type}</strong>
      <span>${ev.house} · R$ ${fmtBRL(ev.value)}</span>
    </div>
    <span class="notif-time">agora</span>
  `;

  let i = 0;
  let timer = null;

  const pushOne = () => {
    const ev = events[i++ % events.length];
    const cards = list.querySelectorAll('.notif-card');
    if (cards.length === 0) return;

    // Rotate: take last, move to top, update content
    const card = cards[cards.length - 1];
    card.innerHTML = cardHTML(ev);
    list.prepend(card);

    // Re-trigger flash animation
    card.classList.remove('notif-flash');
    void card.offsetWidth;
    card.classList.add('notif-flash');

    bell.play();

    // Update other cards' timestamps
    const updated = list.querySelectorAll('.notif-card .notif-time');
    if (updated[1]) updated[1].textContent = '2min';
    if (updated[2]) updated[2].textContent = '5min';
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(pushOne, 5000);
  };
  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  // Only run when section is on screen
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.isIntersecting ? start() : stop());
  }, { threshold: 0.3 });
  io.observe(list);
});

// ============ THEME TOGGLE ============
safe('theme', () => {
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;

  const savedTheme = localStorage.getItem('nemeziz-theme');
  if (savedTheme) {
    root.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }

  themeToggle?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('nemeziz-theme', next);
  });
});

// ============ NAVBAR SCROLL ============
safe('navbar', () => {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
      ticking = false;
    });
  }, { passive: true });
});

// ============ MOBILE MENU ============
safe('menu', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.querySelector('.nav-links');
  if (!menuToggle || !navLinks) return;
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    if (isOpen) {
      navLinks.style.cssText = 'display:flex;position:absolute;top:72px;left:0;right:0;flex-direction:column;padding:20px 24px;background:var(--bg);border-bottom:1px solid var(--border);gap:18px;';
    } else {
      navLinks.style.cssText = '';
    }
  });
});

// ============ REVEAL ON SCROLL ============
safe('reveal', () => {
  const revealEls = document.querySelectorAll(
    '.section-head, .feat, .step, .t-card, .plan, .faq details, .stat'
  );
  revealEls.forEach(el => el.classList.add('reveal'));

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealIO.observe(el));
});

// ============ COUNTER ANIMATION ============
safe('counter', () => {
  const counters = document.querySelectorAll('.stat-num');
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const decimal = parseInt(el.dataset.decimal || '0', 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const startTime = performance.now();

      const fmt = (n) => {
        if (decimal > 0) return n.toFixed(decimal);
        return Math.floor(n).toLocaleString('pt-BR');
      };

      const tick = (now) => {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + fmt(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.4 });

  counters.forEach(c => counterIO.observe(c));
});

// ============ STACK & DETACH ON SCROLL (mobile) ============
safe('stackDetach', () => {
  const groups = document.querySelectorAll('.feat-right, .notif-right, .faq-list');
  if (!groups.length) return;
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  const update = () => {
    if (!isMobile()) {
      // No desktop: limpa qualquer estado para não interferir
      document.querySelectorAll('.detached').forEach(el => el.classList.remove('detached'));
      return;
    }
    const vh = window.innerHeight || document.documentElement.clientHeight;
    groups.forEach(group => {
      const cards = group.children;
      const groupRect = group.getBoundingClientRect();
      // Quanto da seção já passou pela viewport (0 = começou a aparecer, 1 = saiu)
      const start = vh * 0.85; // começa a destacar quando 15% do bottom alcança
      const distance = start - groupRect.top;
      const perCard = 110; // pixels de scroll para destacar cada card
      const detachedCount = Math.max(0, Math.floor(distance / perCard));
      Array.from(cards).forEach((card, i) => {
        if (i < detachedCount) card.classList.add('detached');
        else card.classList.remove('detached');
      });
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
});

// ============ AWARDS SCROLL SPREAD ============
safe('awards', () => {
  const stage = document.querySelector('.awards-stage');
  if (!stage) return;

  let ticking = false;
  const update = () => {
    const rect = stage.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // 0 when stage TOP is at bottom of viewport (just entering)
    // 1 when stage TOP is at 70% of viewport (comfortably visible)
    const start = vh;
    const end = vh * 0.7;
    const progress = (start - rect.top) / (start - end);
    const eased = Math.max(0, Math.min(1, progress));
    stage.style.setProperty('--spread', eased.toFixed(3));
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
});

// ============ SMOOTH SCROLL OFFSET ============
safe('smooth', () => {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
});
