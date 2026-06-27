/**
 * auth.js — Frontend auth logic
 * Handles: login, register, validation, API calls,
 *          JWT token storage, ambient canvas, password strength
 */

const API = 'http://localhost:5000/auth';

/* ══════════════════════════════════════
   AMBIENT CANVAS (same as main app)
══════════════════════════════════════ */
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  const pts = Array.from({ length: 55 }, () => ({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    r: Math.random() * 1.5 + 0.4,
    vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18,
    a: Math.random() * .38 + .07,
    s: Math.random() < .28,
  }));
  (function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.s ? `rgba(249,115,22,${p.a})` : `rgba(100,130,210,${p.a * .55})`;
      ctx.fill();
    });
    requestAnimationFrame(frame);
  })();
})();

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function showAlert(msg, type = 'error') {
  const el = document.getElementById('authAlert');
  if (!el) return;
  el.textContent = (type === 'error' ? '⚠ ' : '✓ ') + msg;
  el.className = `auth-alert ${type}`;
  el.hidden = false;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  const el = document.getElementById('authAlert');
  if (el) el.hidden = true;
}

function setLoading(on) {
  const btn     = document.getElementById('btnSubmit');
  const txt     = document.getElementById('btnText');
  const spinner = document.getElementById('btnSpinner');
  if (!btn) return;
  btn.disabled    = on;
  spinner.hidden  = !on;
  txt.style.opacity = on ? '0.5' : '1';
}

function setFieldState(inputEl, errorEl, msg) {
  if (msg) {
    inputEl.classList.add('invalid'); inputEl.classList.remove('valid');
    if (errorEl) errorEl.textContent = msg;
  } else {
    inputEl.classList.remove('invalid'); inputEl.classList.add('valid');
    if (errorEl) errorEl.textContent = '';
  }
}

function clearFieldState(inputEl, errorEl) {
  inputEl.classList.remove('invalid', 'valid');
  if (errorEl) errorEl.textContent = '';
}

/* ══════════════════════════════════════
   PASSWORD TOGGLE
══════════════════════════════════════ */
document.getElementById('togglePw')?.addEventListener('click', function () {
  const pw = document.getElementById('loginPassword') || document.getElementById('regPassword');
  if (!pw) return;
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  this.textContent = show ? '🙈' : '👁';
});

/* ══════════════════════════════════════
   PASSWORD STRENGTH (register only)
══════════════════════════════════════ */
const regPw = document.getElementById('regPassword');
if (regPw) {
  regPw.addEventListener('input', function () {
    const v = this.value;
    const wrap = document.getElementById('pwStrength');
    const fill  = document.getElementById('pwFill');
    const label = document.getElementById('pwLabel');
    if (!wrap) return;

    if (!v) { wrap.hidden = true; return; }
    wrap.hidden = false;

    let score = 0;
    if (v.length >= 8)  score++;
    if (v.length >= 12) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;

    const levels = [
      { pct: '20%', color: '#f43f5e', text: 'Very weak' },
      { pct: '40%', color: '#f97316', text: 'Weak' },
      { pct: '60%', color: '#fbbf24', text: 'Fair' },
      { pct: '80%', color: '#34d399', text: 'Strong' },
      { pct: '100%',color: '#10b981', text: 'Very strong' },
    ];
    const lvl = levels[Math.min(score, 4)];
    fill.style.width      = lvl.pct;
    fill.style.background = lvl.color;
    label.textContent     = lvl.text;
    label.style.color     = lvl.color;
  });
}

/* ══════════════════════════════════════
   SOCIAL BUTTONS (placeholder)
══════════════════════════════════════ */
document.getElementById('btnGoogle')?.addEventListener('click', () => {
  showAlert('Google sign-in coming soon — use email/password for now.', 'error');
});
document.getElementById('btnGithub')?.addEventListener('click', () => {
  showAlert('GitHub sign-in coming soon — use email/password for now.', 'error');
});

/* ══════════════════════════════════════
   LOGIN FORM
══════════════════════════════════════ */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email    = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');
    const remember = document.getElementById('rememberMe');
    let valid = true;

    // Validate email
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      setFieldState(email, document.getElementById('emailErr'), 'Please enter a valid email address');
      valid = false;
    } else {
      setFieldState(email, document.getElementById('emailErr'), '');
    }

    // Validate password
    if (!password.value) {
      setFieldState(password, document.getElementById('pwErr'), 'Password is required');
      valid = false;
    } else {
      setFieldState(password, document.getElementById('pwErr'), '');
    }

    if (!valid) return;

    setLoading(true);
    try {
      const res  = await fetch(`${API}/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    email.value.trim().toLowerCase(),
          password: password.value,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || 'Invalid email or password', 'error');
        setFieldState(email, null, ' ');
        setFieldState(password, document.getElementById('pwErr'), 'Incorrect credentials');
      } else {
        // Store token
        const store = remember?.checked ? localStorage : sessionStorage;
        store.setItem('isl_token', data.token);
        store.setItem('isl_user',  JSON.stringify(data.user));

        showAlert('Sign in successful! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 900);
      }
    } catch {
      showAlert('Cannot connect to server. Make sure the backend is running on port 5000.', 'error');
    }
    setLoading(false);
  });

  // Real-time validation
  document.getElementById('loginEmail')?.addEventListener('blur', function () {
    if (this.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)) {
      setFieldState(this, document.getElementById('emailErr'), 'Enter a valid email address');
    } else {
      clearFieldState(this, document.getElementById('emailErr'));
    }
  });
}

/* ══════════════════════════════════════
   REGISTER FORM
══════════════════════════════════════ */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const firstName   = document.getElementById('firstName');
    const lastName    = document.getElementById('lastName');
    const email       = document.getElementById('regEmail');
    const password    = document.getElementById('regPassword');
    const confirm     = document.getElementById('confirmPassword');
    const terms       = document.getElementById('acceptTerms');
    let valid = true;

    // First name
    if (!firstName.value.trim()) {
      setFieldState(firstName, document.getElementById('firstNameErr'), 'First name is required'); valid = false;
    } else { setFieldState(firstName, document.getElementById('firstNameErr'), ''); }

    // Last name
    if (!lastName.value.trim()) {
      setFieldState(lastName, document.getElementById('lastNameErr'), 'Last name is required'); valid = false;
    } else { setFieldState(lastName, document.getElementById('lastNameErr'), ''); }

    // Email
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      setFieldState(email, document.getElementById('emailErr'), 'Enter a valid email address'); valid = false;
    } else { setFieldState(email, document.getElementById('emailErr'), ''); }

    // Password
    if (!password.value || password.value.length < 8) {
      setFieldState(password, document.getElementById('pwErr'), 'Password must be at least 8 characters'); valid = false;
    } else { setFieldState(password, document.getElementById('pwErr'), ''); }

    // Confirm
    if (password.value !== confirm.value) {
      setFieldState(confirm, document.getElementById('confirmErr'), 'Passwords do not match'); valid = false;
    } else { setFieldState(confirm, document.getElementById('confirmErr'), ''); }

    // Terms
    if (!terms.checked) {
      document.getElementById('termsErr').textContent = 'You must accept the terms to continue';
      valid = false;
    } else {
      document.getElementById('termsErr').textContent = '';
    }

    if (!valid) return;

    setLoading(true);
    try {
      const res  = await fetch(`${API}/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.value.trim(),
          last_name:  lastName.value.trim(),
          email:      email.value.trim().toLowerCase(),
          password:   password.value,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || 'Registration failed. Please try again.', 'error');
        if (data.error?.toLowerCase().includes('email')) {
          setFieldState(email, document.getElementById('emailErr'), 'This email is already registered');
        }
      } else {
        sessionStorage.setItem('isl_token', data.token);
        sessionStorage.setItem('isl_user',  JSON.stringify(data.user));
        showAlert('Account created! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 900);
      }
    } catch {
      showAlert('Cannot connect to server. Make sure the backend is running on port 5000.', 'error');
    }
    setLoading(false);
  });
}

/* ══════════════════════════════════════
   AUTH GUARD — redirect if already logged in
══════════════════════════════════════ */
(function checkAuth() {
  const token = localStorage.getItem('isl_token') || sessionStorage.getItem('isl_token');
  const isAuthPage = window.location.pathname.includes('login') ||
                     window.location.pathname.includes('register');
  if (token && isAuthPage) {
    window.location.href = 'index.html';
  }
})();
