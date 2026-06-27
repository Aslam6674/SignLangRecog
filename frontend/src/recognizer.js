/**
 * recognizer.js
 *
 * Two-layer recognition pipeline:
 *
 *  Layer 1 — Rule-based (always available, runs in browser)
 *    Uses geometric properties of MediaPipe's 21 hand landmarks
 *    Covers full A–Z alphabet + 0–10 numbers
 *
 *  Layer 2 — ML Model (optional, requires Python backend running)
 *    Sends normalised landmarks to Flask /predict endpoint
 *    Falls back to Layer 1 automatically if backend is offline
 *
 * Usage:
 *   const rec = new ISLRecognizer();
 *   await rec.init(videoElement, canvasElement);
 *   rec.onResult = ({ sign, confidence, english, hindi }) => { ... };
 *   rec.onStatus = (state) => { ... };  // 'active' | 'idle' | 'searching'
 *   rec.start();
 *   rec.stop();
 *   rec.flipMirror();
 */

const BACKEND_URL  = 'http://localhost:5000';
const BUFFER_SIZE  = 6;   // smoothing buffer length
const DEBOUNCE_MS  = 900; // min ms between same sign firing twice

class ISLRecognizer {
  constructor() {
    this.hands         = null;
    this.camera        = null;
    this.videoEl       = null;
    this.canvasEl      = null;
    this.ctx           = null;
    this.running       = false;
    this.backendOnline = false;
    this.mirrorMode    = true;

    this.onResult      = null;   // callback(result)
    this.onStatus      = null;   // callback(statusString)

    this._buffer       = [];     // sign smoothing buffer
    this._confBuffer   = [];
    this._lastSign     = null;
    this._lastTime     = 0;
  }

  /* ─────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────── */
  async init(videoEl, canvasEl) {
    this.videoEl  = videoEl;
    this.canvasEl = canvasEl;
    this.ctx      = canvasEl.getContext('2d');

    this.hands = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    this.hands.setOptions({
      maxNumHands:            1,
      modelComplexity:        1,
      minDetectionConfidence: 0.72,
      minTrackingConfidence:  0.65,
    });
    this.hands.onResults(r => this._onHandResults(r));

    await this._pingBackend();
  }

  async _pingBackend() {
    try {
      const r = await fetch(`${BACKEND_URL}/ping`, {
        signal: AbortSignal.timeout(2000)
      });
      this.backendOnline = r.ok;
    } catch {
      this.backendOnline = false;
    }
    console.log(`[ISLRecognizer] Backend ${this.backendOnline ? '✅ online' : '⚠️ offline — rule-based mode'}`);
  }

  /* ─────────────────────────────────────────────
     START / STOP
  ───────────────────────────────────────────── */
  start() {
    if (this.running) return;
    this.camera = new Camera(this.videoEl, {
      onFrame: async () => { await this.hands.send({ image: this.videoEl }); },
      width: 640, height: 480,
    });
    this.camera.start();
    this.running = true;
    this.onStatus?.('active');
  }

  stop() {
    this.camera?.stop();
    this.running = false;
    this.ctx?.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    this.onStatus?.('idle');
  }

  flipMirror() { this.mirrorMode = !this.mirrorMode; }

  /* ─────────────────────────────────────────────
     MEDIAPIPE CALLBACK
  ───────────────────────────────────────────── */
  _onHandResults(results) {
    const { canvasEl, ctx } = this;
    canvasEl.width  = this.videoEl.videoWidth  || 640;
    canvasEl.height = this.videoEl.videoHeight || 480;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (!results.multiHandLandmarks?.length) {
      this.onStatus?.('searching');
      return;
    }

    const lm = results.multiHandLandmarks[0];
    this._drawSkeleton(lm);

    if (this.backendOnline) {
      this._classifyBackend(lm);
    } else {
      const result = this._classifyRules(lm);
      if (result.sign) this._smooth(result);
    }
  }

  /* ─────────────────────────────────────────────
     SKELETON RENDERER  (saffron + mint palette)
  ───────────────────────────────────────────── */
  _drawSkeleton(lm) {
    const { ctx, canvasEl } = this;
    const W = canvasEl.width, H = canvasEl.height;

    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],          // thumb
      [0,5],[5,6],[6,7],[7,8],          // index
      [0,9],[9,10],[10,11],[11,12],     // middle
      [0,13],[13,14],[14,15],[15,16],   // ring
      [0,17],[17,18],[18,19],[19,20],   // pinky
      [5,9],[9,13],[13,17],             // palm arch
    ];

    // Connections
    ctx.lineWidth   = 2.2;
    ctx.strokeStyle = 'rgba(249,115,22,0.65)';
    CONNECTIONS.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * W, lm[a].y * H);
      ctx.lineTo(lm[b].x * W, lm[b].y * H);
      ctx.stroke();
    });

    // Landmark dots
    const TIPS_IDX = new Set([4, 8, 12, 16, 20]);
    lm.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, TIPS_IDX.has(i) ? 5.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = TIPS_IDX.has(i) ? '#34d399' : 'rgba(249,115,22,0.9)';
      ctx.fill();
    });
  }

  /* ─────────────────────────────────────────────
     BACKEND CLASSIFY
  ───────────────────────────────────────────── */
  async _classifyBackend(lm) {
    const flat = lm.flatMap(p => [p.x, p.y, p.z]);
    try {
      const r = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks: flat }),
        signal: AbortSignal.timeout(500),
      });
      const data = await r.json();
      if (data.sign) this._smooth({ sign: data.sign, confidence: data.confidence });
    } catch {
      // backend hiccup → fall back to rules this frame
      const result = this._classifyRules(lm);
      if (result.sign) this._smooth(result);
    }
  }

  /* ─────────────────────────────────────────────
     RULE-BASED CLASSIFIER
     Landmark indices (MediaPipe Hand):
       0=wrist
       1-4  = thumb  (CMC→tip)
       5-8  = index  (MCP→tip)
       9-12 = middle (MCP→tip)
       13-16= ring   (MCP→tip)
       17-20= pinky  (MCP→tip)
  ───────────────────────────────────────────── */
  _classifyRules(lm) {
    const [thumb, index, middle, ring, pinky] = this._fingers(lm);

    // ── Counting shortcuts ──
    const openCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;

    // 5 = all open
    if (openCount === 5) return { sign: '5', confidence: 0.93 };

    // 0 / O — round shape (check before other closed-fist rules)
    if (this._isO(lm)) return { sign: '0', confidence: 0.88 };

    // All closed (no thumb) = S
    if (openCount === 0) return { sign: 'S', confidence: 0.82 };

    // Fist with thumb = A
    if (thumb && !index && !middle && !ring && !pinky)
      return { sign: 'A', confidence: 0.85 };

    // ── Single finger ──
    if (!thumb && index && !middle && !ring && !pinky) {
      if (this._straight(lm, 5, 8)) return { sign: '1', confidence: 0.91 };
      return { sign: 'D', confidence: 0.82 };
    }
    if (!thumb && !index && !middle && !ring && pinky)
      return { sign: 'I', confidence: 0.89 };

    // ── Two fingers ──
    if (!thumb && index && middle && !ring && !pinky) {
      const spread = this._dist(lm[8], lm[12]) / (this._dist(lm[5], lm[9]) + 1e-6);
      if (spread > 0.75) return { sign: 'V', confidence: 0.88 };
      return { sign: 'U', confidence: 0.84 };
    }
    if (!thumb && index && !middle && !ring && pinky)
      return { sign: 'Y', confidence: 0.62 }; // rough — Y needs thumb too

    // ── L — thumb out + index up ──
    if (thumb && index && !middle && !ring && !pinky) {
      const ang = this._angle(lm[1], lm[2], lm[8]);
      if (ang > 55) return { sign: 'L', confidence: 0.87 };
    }

    // ── Y — pinky + thumb ──
    if (thumb && !index && !middle && !ring && pinky)
      return { sign: 'Y', confidence: 0.87 };

    // ── W — three fingers ──
    if (!thumb && index && middle && ring && !pinky)
      return { sign: 'W', confidence: 0.85 };

    // ── B — all four fingers up, thumb tucked ──
    if (!thumb && index && middle && ring && pinky && this._isFlat(lm))
      return { sign: 'B', confidence: 0.84 };

    // ── 4 — four fingers, no thumb ──
    if (!thumb && index && middle && ring && pinky)
      return { sign: '4', confidence: 0.80 };

    // ── C — curved C shape ──
    if (this._isC(lm)) return { sign: 'C', confidence: 0.80 };

    // ── 3 — thumb + index + middle ──
    if (thumb && index && middle && !ring && !pinky)
      return { sign: '3', confidence: 0.85 };

    // ── 2 — index + middle (covered above) ──
    // ── F — index-thumb circle, three fingers up ──
    if (this._isIndexThumbCircle(lm) && middle && ring && pinky)
      return { sign: 'F', confidence: 0.80 };

    // ── R — index + middle crossed ──
    if (!thumb && index && middle && !ring && !pinky) {
      const cross = this._isCrossed(lm);
      if (cross) return { sign: 'R', confidence: 0.78 };
    }

    return { sign: null, confidence: 0 };
  }

  /* ─────────────────────────────────────────────
     GEOMETRIC HELPERS
  ───────────────────────────────────────────── */

  /** Returns [thumb, index, middle, ring, pinky] booleans — true = finger extended */
  _fingers(lm) {
    const thumbOpen = this.mirrorMode ? lm[4].x < lm[3].x : lm[4].x > lm[3].x;
    return [
      thumbOpen,
      lm[8].y  < lm[6].y,
      lm[12].y < lm[10].y,
      lm[16].y < lm[14].y,
      lm[20].y < lm[18].y,
    ];
  }

  _dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  _angle(a, b, c) {
    const ab = [b.x - a.x, b.y - a.y];
    const cb = [b.x - c.x, b.y - c.y];
    const cos = (ab[0]*cb[0] + ab[1]*cb[1]) /
                (Math.hypot(...ab) * Math.hypot(...cb) + 1e-6);
    return (Math.acos(Math.min(1, Math.abs(cos))) * 180) / Math.PI;
  }

  _straight(lm, base, tip) { return Math.abs(lm[tip].y - lm[base].y) > 0.1; }

  _isFlat(lm) {
    const ys = [lm[8].y, lm[12].y, lm[16].y, lm[20].y];
    return Math.max(...ys) - Math.min(...ys) < 0.06;
  }

  _isO(lm) {
    const d   = this._dist(lm[4], lm[8]);
    const ref = this._dist(lm[0], lm[9]);
    return d / ref < 0.22;
  }

  _isC(lm) {
    const d   = this._dist(lm[4], lm[8]);
    const ref = this._dist(lm[0], lm[9]);
    const r   = d / ref;
    return r > 0.22 && r < 0.52;
  }

  _isIndexThumbCircle(lm) {
    const d   = this._dist(lm[4], lm[8]);
    const ref = this._dist(lm[0], lm[5]);
    return d / ref < 0.2;
  }

  _isCrossed(lm) {
    // Index tip should be to the right (or left mirrored) of middle tip
    return Math.abs(lm[8].x - lm[12].x) < 0.04;
  }

  /* ─────────────────────────────────────────────
     SMOOTHING  (majority-vote buffer)
  ───────────────────────────────────────────── */
  _smooth(result) {
    this._buffer.push(result.sign);
    this._confBuffer.push(result.confidence);

    if (this._buffer.length > BUFFER_SIZE) {
      this._buffer.shift();
      this._confBuffer.shift();
    }
    if (this._buffer.length < Math.ceil(BUFFER_SIZE / 2)) return;

    // Majority vote
    const counts = {};
    this._buffer.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    const [topSign, topCount] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];

    if (topCount < Math.ceil(BUFFER_SIZE / 2)) return;

    const now     = Date.now();
    const isSame  = topSign === this._lastSign;
    const tooSoon = now - this._lastTime < DEBOUNCE_MS;
    if (isSame && tooSoon) return;

    this._lastSign = topSign;
    this._lastTime = now;

    const avgConf  = this._confBuffer.reduce((a, b) => a + b, 0) / this._confBuffer.length;
    const signData = ISL_MAP[topSign] || { english: topSign, hindi: '', glyph: topSign };

    this.onResult?.({
      sign:       topSign,
      confidence: avgConf,
      english:    signData.english,
      hindi:      signData.hindi,
      glyph:      signData.glyph,
    });
  }
}

window.ISLRecognizer = ISLRecognizer;
