/**
 * app.js — Main entry point
 *
 * Responsibilities:
 *  • Boot UI modules (ambient canvas, tabs, learn grid, tips)
 *  • Manage camera lifecycle (start / stop / flip / fullscreen)
 *  • Wire recognizer results → display + history + stats
 *  • Sentence builder actions (add, speak, copy, clear)
 *  • Keyboard shortcuts
 */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Boot UI ── */
  UI.initAmbientCanvas();
  UI.initTabs();
  UI.initLearnFilters();
  UI.initTipsRotator();

  /* ── DOM references ── */
  const videoEl    = document.getElementById('videoEl');
  const overlayEl  = document.getElementById('overlayCanvas');
  const camIdle    = document.getElementById('camIdle');
  const scanBar    = document.getElementById('scanBar');
  const confStrip  = document.getElementById('confStrip');
  const confFill   = document.getElementById('confFill');
  const confPct    = document.getElementById('confPct');
  const livePill   = document.getElementById('livePill');

  const signGlyph  = document.getElementById('signGlyph');
  const signEng    = document.getElementById('signEnglish');
  const signDeva   = document.getElementById('signDevanagari');

  const btnCamera       = document.getElementById('btnCamera');
  const btnCamIcon      = document.getElementById('btnCamIcon');
  const btnCamLabel     = document.getElementById('btnCamLabel');
  const btnFlip         = document.getElementById('btnFlip');
  const btnFullscreen   = document.getElementById('btnFullscreen');

  const btnAddWord      = document.getElementById('btnAddWord');
  const btnSpeakSign    = document.getElementById('btnSpeakSign');
  const btnSpeakSentence= document.getElementById('btnSpeakSentence');
  const btnCopySentence = document.getElementById('btnCopySentence');
  const btnClearSentence= document.getElementById('btnClearSentence');
  const btnClearHistory = document.getElementById('btnClearHistory');

  const statSigns  = document.getElementById('statSigns');
  const statAvg    = document.getElementById('statAvg');
  const statStreak = document.getElementById('statStreak');

  /* ── App state ── */
  const rec      = new ISLRecognizer();
  const sentence = new UI.SentenceBuilder();
  const history  = new UI.HistoryPanel();

  let camRunning   = false;
  let recInited    = false;
  let currentSign  = null;
  let currentEng   = '';
  let totalSigns   = 0;
  let confAccum    = 0;
  let streak       = 0;

  /* ── Set up recognizer callbacks ── */
  rec.onStatus = (status) => {
    if (status === 'active') {
      UI.setStatus('active', 'Camera live');
      scanBar.classList.add('running');
      livePill.textContent = '● SCANNING';
      livePill.className   = 'live-pill detecting';
    } else if (status === 'idle') {
      UI.setStatus('offline', 'Ready');
      scanBar.classList.remove('running');
      livePill.textContent = '● IDLE';
      livePill.className   = 'live-pill';
    } else if (status === 'searching') {
      livePill.textContent = '● SEARCHING';
      livePill.className   = 'live-pill detecting';
      UI.setStatus('active', 'Camera live');
    }
  };

  rec.onResult = (result) => {
    currentSign = result.sign;
    currentEng  = result.english || result.sign;

    /* ── Sign display ── */
    signGlyph.textContent = result.glyph || result.sign;
    signEng.textContent   = result.english || result.sign;
    signDeva.textContent  = result.hindi || '';

    // Trigger pop animation
    signGlyph.classList.remove('detected');
    void signGlyph.offsetWidth;             // force reflow
    signGlyph.classList.add('detected');

    /* ── Confidence bar ── */
    const pct = Math.round(result.confidence * 100);
    confFill.style.width  = `${pct}%`;
    confPct.textContent   = `${pct}%`;
    confStrip.hidden      = false;

    /* ── Live pill ── */
    livePill.textContent = `● ${result.sign}`;
    livePill.className   = 'live-pill live';

    /* ── Status chip ── */
    UI.setStatus('detecting', `Detected: ${result.sign}`);

    /* ── History ── */
    history.push(result.sign);

    /* ── Stats ── */
    totalSigns++;
    confAccum += result.confidence;
    streak++;
    statSigns.textContent  = totalSigns;
    statAvg.textContent    = `${Math.round((confAccum / totalSigns) * 100)}%`;
    statStreak.textContent = `${streak}🔥`;
  };

  /* ══════════════════════════════════════════════
     CAMERA TOGGLE
  ══════════════════════════════════════════════ */
  btnCamera.addEventListener('click', async () => {
    if (!camRunning) {
      /* ── START ── */
      btnCamera.disabled  = true;
      btnCamLabel.textContent = 'Starting…';

      try {
        // Check permission first
        await navigator.mediaDevices.getUserMedia({ video: true });

        if (!recInited) {
          await rec.init(videoEl, overlayEl);
          recInited = true;
        }

        rec.start();
        camRunning = true;

        // Show video, hide idle overlay
        camIdle.classList.add('hidden');
        confStrip.hidden = false;

        btnCamIcon.textContent  = '◼';
        btnCamLabel.textContent = 'Stop Camera';
        btnCamera.classList.add('active');

        UI.showToast('Camera started — show an ISL sign! (or press Space to add)');

      } catch (err) {
        console.error(err);
        UI.showToast('Camera permission denied — please allow camera access in your browser');
        btnCamLabel.textContent = 'Start Camera';
      }

      btnCamera.disabled = false;

    } else {
      /* ── STOP ── */
      rec.stop();
      camRunning = false;

      camIdle.classList.remove('hidden');
      confStrip.hidden = true;
      scanBar.classList.remove('running');

      btnCamIcon.textContent  = '▶';
      btnCamLabel.textContent = 'Start Camera';
      btnCamera.classList.remove('active');

      livePill.textContent = '● IDLE';
      livePill.className   = 'live-pill';
      UI.setStatus('offline', 'Ready');

      // Reset sign display
      signGlyph.textContent = '—';
      signGlyph.classList.remove('detected');
      signEng.textContent   = 'Show an ISL sign';
      signDeva.textContent  = '';
      currentSign           = null;
      currentEng            = '';
    }
  });

  /* ══════════════════════════════════════════════
     CAMERA CONTROLS
  ══════════════════════════════════════════════ */
  btnFlip.addEventListener('click', () => {
    rec.flipMirror();
    // Toggle CSS mirror on video + overlay
    const isMirror = rec.mirrorMode;
    videoEl.style.transform   = isMirror ? 'scaleX(-1)' : 'scaleX(1)';
    overlayEl.style.transform = isMirror ? 'scaleX(-1)' : 'scaleX(1)';
    UI.showToast(isMirror ? 'Mirror on' : 'Mirror off');
  });

  btnFullscreen.addEventListener('click', () => {
    const frame = document.getElementById('camFrame');
    if (!document.fullscreenElement) {
      frame.requestFullscreen?.().catch(() => UI.showToast('Fullscreen not available'));
    } else {
      document.exitFullscreen?.();
    }
  });

  /* ══════════════════════════════════════════════
     DETECTION MODE
  ══════════════════════════════════════════════ */
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      UI.showToast(`Mode switched to: ${btn.dataset.mode}`);
    });
  });

  /* ══════════════════════════════════════════════
     SENTENCE BUILDER ACTIONS
  ══════════════════════════════════════════════ */
  btnAddWord.addEventListener('click', () => {
    if (!currentEng) { UI.showToast('No sign detected yet'); return; }
    sentence.add(currentEng);
    UI.showToast(`Added "${currentEng}" to sentence`);
  });

  btnSpeakSign.addEventListener('click', () => {
    if (!currentEng) { UI.showToast('Nothing to speak'); return; }
    UI.speak(currentEng);
  });

  btnSpeakSentence.addEventListener('click', () => {
    const text = sentence.getText();
    if (!text) { UI.showToast('Sentence is empty'); return; }
    UI.speak(text);
  });

  btnCopySentence.addEventListener('click', async () => {
    const text = sentence.getText();
    if (!text) { UI.showToast('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(text);
      UI.showToast('Copied to clipboard ✓');
    } catch {
      UI.showToast('Copy failed — select text manually');
    }
  });

  btnClearSentence.addEventListener('click', () => {
    sentence.clear();
    UI.showToast('Sentence cleared');
  });

  /* ══════════════════════════════════════════════
     HISTORY
  ══════════════════════════════════════════════ */
  btnClearHistory.addEventListener('click', () => {
    history.clear();
    streak = 0;
    statStreak.textContent = '0🔥';
    UI.showToast('History cleared');
  });

  /* ══════════════════════════════════════════════
     KEYBOARD SHORTCUTS
  ══════════════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    // Don't fire when typing in search box
    if (e.target.tagName === 'INPUT') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (camRunning) btnAddWord.click();
        break;
      case 'KeyS':
        if (!e.metaKey && !e.ctrlKey && camRunning) btnSpeakSign.click();
        break;
      case 'KeyR':
        if (!e.metaKey && !e.ctrlKey) btnCamera.click();
        break;
    }
  });

  /* ══════════════════════════════════════════════
     PAGE VISIBILITY — pause video when tab hidden
  ══════════════════════════════════════════════ */
  document.addEventListener('visibilitychange', () => {
    if (!camRunning) return;
    if (document.hidden) {
      videoEl.pause?.();
    } else {
      videoEl.play?.();
    }
  });

  /* ── Dev log ── */
  console.log(
    '%c🤟 ISL Decode ready',
    'color:#f97316;font-size:15px;font-weight:700;background:#0a0f1e;padding:4px 8px;border-radius:4px'
  );
  console.log('Keyboard shortcuts: Space = add sign | S = speak | R = toggle camera');
});
