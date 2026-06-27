/**
 * ui.js — UI rendering helpers
 *
 * Exports (on window.UI):
 *   initAmbientCanvas()
 *   initTabs()
 *   initLearnFilters()
 *   initTipsRotator()
 *   setStatus(state, text)
 *   showToast(msg, duration?)
 *   speak(text)
 *   SentenceBuilder  (class)
 *   HistoryPanel     (class)
 */

/* ══════════════════════════════════════════════
   AMBIENT CANVAS — floating particles (bg)
══════════════════════════════════════════════ */
function initAmbientCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 70 }, () => ({
    x:  Math.random() * window.innerWidth,
    y:  Math.random() * window.innerHeight,
    r:  Math.random() * 1.6 + 0.4,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    a:  Math.random() * 0.4 + 0.08,
    saffron: Math.random() < 0.28,
  }));

  (function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.saffron
        ? `rgba(249,115,22,${p.a})`
        : `rgba(100,130,210,${p.a * 0.55})`;
      ctx.fill();
    });
    requestAnimationFrame(frame);
  })();
}

/* ══════════════════════════════════════════════
   TABS
══════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`)?.classList.add('active');
    });
  });
}

/* ══════════════════════════════════════════════
   STATUS CHIP
══════════════════════════════════════════════ */
function setStatus(state, text) {
  const chip = document.getElementById('statusChip');
  if (!chip) return;
  chip.querySelector('.status-dot').className = `status-dot ${state}`;
  chip.querySelector('.status-text').textContent = text;
}

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
let _toastTimer = null;
function showToast(msg, duration = 2600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ══════════════════════════════════════════════
   LEARN SIGN GRID
══════════════════════════════════════════════ */
function renderSignGrid(filter = 'all', query = '') {
  const grid = document.getElementById('signGrid');
  if (!grid) return;

  const q = query.trim().toLowerCase();
  const signs = ISL_SIGNS.filter(s => {
    const matchCat = filter === 'all' || s.category === filter;
    const matchQ   = !q
      || s.english.toLowerCase().includes(q)
      || s.hindi.includes(query)
      || s.id.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (!signs.length) {
    grid.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;padding:20px 0">
      No signs found for "<strong>${query}</strong>"</p>`;
    return;
  }

  grid.innerHTML = signs.map(s => `
    <div class="sign-tile" data-id="${s.id}" tabindex="0" role="button"
         aria-label="ISL sign for ${s.english}">
      <div class="tile-glyph">${s.glyph}</div>
      <div class="tile-label">${s.english}</div>
      <div class="tile-hindi">${s.hindi}</div>
      <div class="tile-cat">${s.category}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.sign-tile').forEach(tile => {
    const activate = () => {
      const sign = ISL_MAP[tile.dataset.id];
      if (sign) showToast(`${sign.english}: ${sign.handshape}`);
    };
    tile.addEventListener('click', activate);
    tile.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
}

/* ══════════════════════════════════════════════
   LEARN FILTERS + SEARCH
══════════════════════════════════════════════ */
function initLearnFilters() {
  let activeFilter = 'all';
  let searchQ = '';

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderSignGrid(activeFilter, searchQ);
    });
  });

  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.addEventListener('input', e => {
      searchQ = e.target.value;
      renderSignGrid(activeFilter, searchQ);
    });
  }

  renderSignGrid(); // initial render
}

/* ══════════════════════════════════════════════
   TIPS ROTATOR
══════════════════════════════════════════════ */
function initTipsRotator() {
  const el = document.getElementById('tipText');
  if (!el || !window.TIPS?.length) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % TIPS.length;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = TIPS[i];
      el.style.opacity = '1';
    }, 300);
  }, 5000);
}

/* ══════════════════════════════════════════════
   SENTENCE BUILDER
══════════════════════════════════════════════ */
class SentenceBuilder {
  constructor() {
    this.words   = [];
    this.bodyEl  = document.getElementById('sentenceBody');
    this.countEl = document.getElementById('wordCount');
  }

  add(word) {
    if (!word) return;
    this.words.push(word);
    this._render();
  }

  clear() { this.words = []; this._render(); }

  getText() { return this.words.join(' '); }

  _render() {
    if (!this.bodyEl) return;
    if (!this.words.length) {
      this.bodyEl.innerHTML = '<span class="sentence-empty">Add signs to build a sentence…</span>';
      if (this.countEl) this.countEl.textContent = '0 words';
      return;
    }

    this.bodyEl.innerHTML = this.words.map((w, i) => `
      <span class="sentence-word" data-idx="${i}">
        ${w} <span>✕</span>
      </span>`).join('');

    if (this.countEl) {
      const n = this.words.length;
      this.countEl.textContent = `${n} word${n !== 1 ? 's' : ''}`;
    }

    // Click individual word to remove it
    this.bodyEl.querySelectorAll('.sentence-word').forEach(el => {
      el.addEventListener('click', () => {
        this.words.splice(parseInt(el.dataset.idx), 1);
        this._render();
      });
    });
  }
}

/* ══════════════════════════════════════════════
   HISTORY PANEL
══════════════════════════════════════════════ */
class HistoryPanel {
  constructor() {
    this.items = [];
    this.el    = document.getElementById('historyChips');
  }

  push(sign) {
    if (this.items[0] === sign) return; // deduplicate consecutive
    this.items.unshift(sign);
    if (this.items.length > 24) this.items.pop();
    this._render();
  }

  clear() { this.items = []; this._render(); }

  _render() {
    if (!this.el) return;
    if (!this.items.length) {
      this.el.innerHTML = '<span class="chips-empty">Nothing yet</span>';
      return;
    }
    this.el.innerHTML = this.items.map(s => `
      <span class="history-chip">${s}</span>
    `).join('');
  }
}

/* ══════════════════════════════════════════════
   WEB SPEECH API
══════════════════════════════════════════════ */
function speak(text) {
  if (!text) return;
  if (!('speechSynthesis' in window)) {
    showToast('Speech not supported in this browser');
    return;
  }
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = 'en-IN';
  utt.rate   = 0.88;
  utt.pitch  = 1;
  window.speechSynthesis.speak(utt);
}

/* ── Export ── */
window.UI = {
  initAmbientCanvas,
  initTabs,
  initLearnFilters,
  initTipsRotator,
  setStatus,
  showToast,
  speak,
  SentenceBuilder,
  HistoryPanel,
};
