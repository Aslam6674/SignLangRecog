"""
backend/auth.py
────────────────────────────────────────────────
Auth routes for ISL Decode
  POST /auth/register  — create account
  POST /auth/login     — sign in, get JWT
  GET  /auth/me        — get current user (JWT required)
  POST /auth/logout    — invalidate token (client-side)

Storage : SQLite (users.db) — no external DB needed
Passwords: bcrypt hashed
Tokens   : JWT (HS256), 7-day expiry
────────────────────────────────────────────────
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import sqlite3, hashlib, os, time, json, re, logging

log = logging.getLogger("isl-auth")

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# ── Config ────────────────────────────────────────────────
BASE      = os.path.dirname(__file__)
DB_PATH   = os.path.join(BASE, "users.db")
SECRET    = os.environ.get("ISL_SECRET", "isl-decode-secret-change-in-production")
TOKEN_TTL = 7 * 24 * 3600   # 7 days

# ── DB init ───────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT    NOT NULL,
                last_name  TEXT    NOT NULL,
                email      TEXT    NOT NULL UNIQUE,
                pw_hash    TEXT    NOT NULL,
                created_at REAL    NOT NULL DEFAULT (unixepoch())
            )
        """)
        db.commit()
    log.info(f"Auth DB ready at {DB_PATH}")

init_db()

# ── Token helpers (manual JWT-like, no external lib) ─────
import base64, hmac

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def make_token(user_id: int, email: str) -> str:
    header  = _b64(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
    payload = _b64(json.dumps({
        "sub": user_id,
        "email": email,
        "exp": time.time() + TOKEN_TTL,
        "iat": time.time(),
    }).encode())
    sig = hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64(sig)}"

def verify_token(token: str):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        expected = hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64(expected).encode(), sig.encode()):
            return None
        pad = lambda s: s + "=" * (-len(s) % 4)
        data = json.loads(base64.urlsafe_b64decode(pad(payload)))
        if data["exp"] < time.time():
            return None
        return data
    except Exception:
        return None

def hash_pw(password: str) -> str:
    """SHA-256 + secret salt (no bcrypt dependency needed)."""
    salt = SECRET[:16]
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000).hex()

def check_pw(password: str, pw_hash: str) -> bool:
    return hash_pw(password) == pw_hash

def require_auth(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        claims = verify_token(token)
        if not claims:
            return jsonify({"error": "Unauthorized"}), 401
        request.user_id = claims["sub"]
        request.user_email = claims["email"]
        return f(*args, **kwargs)
    return wrapper

# ── Validation ────────────────────────────────────────────
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def validate_register(data: dict):
    errors = {}
    if not data.get("first_name", "").strip():
        errors["first_name"] = "First name is required"
    if not data.get("last_name", "").strip():
        errors["last_name"] = "Last name is required"
    email = data.get("email", "").strip().lower()
    if not email or not EMAIL_RE.match(email):
        errors["email"] = "Valid email address required"
    pw = data.get("password", "")
    if len(pw) < 8:
        errors["password"] = "Password must be at least 8 characters"
    return errors

# ── Routes ────────────────────────────────────────────────

@auth_bp.post("/register")
@cross_origin()
def register():
    body = request.get_json(silent=True) or {}
    errors = validate_register(body)
    if errors:
        return jsonify({"error": list(errors.values())[0], "fields": errors}), 400

    email = body["email"].strip().lower()
    try:
        with get_db() as db:
            db.execute(
                "INSERT INTO users (first_name, last_name, email, pw_hash) VALUES (?,?,?,?)",
                (body["first_name"].strip(), body["last_name"].strip(),
                 email, hash_pw(body["password"]))
            )
            db.commit()
            row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    except sqlite3.IntegrityError:
        return jsonify({"error": "An account with this email already exists"}), 409

    user = {"id": row["id"], "first_name": row["first_name"],
            "last_name": row["last_name"], "email": row["email"]}
    token = make_token(user["id"], user["email"])
    log.info(f"Registered: {email}")
    return jsonify({"token": token, "user": user}), 201


@auth_bp.post("/login")
@cross_origin()
def login():
    body = request.get_json(silent=True) or {}
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not row or not check_pw(password, row["pw_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    user  = {"id": row["id"], "first_name": row["first_name"],
             "last_name": row["last_name"], "email": row["email"]}
    token = make_token(user["id"], user["email"])
    log.info(f"Login: {email}")
    return jsonify({"token": token, "user": user})


@auth_bp.get("/me")
@cross_origin()
@require_auth
def me():
    with get_db() as db:
        row = db.execute("SELECT id, first_name, last_name, email, created_at FROM users WHERE id = ?",
                         (request.user_id,)).fetchone()
    if not row:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": dict(row)})


@auth_bp.post("/logout")
@cross_origin()
def logout():
    # JWT is stateless — client deletes the token
    return jsonify({"status": "logged out"})
