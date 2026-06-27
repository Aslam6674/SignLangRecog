"""
backend/app.py
Flask REST API for ISL Recognition

Routes:
  GET  /ping          — health check
  POST /predict       — classify landmarks → ISL sign
  POST /train         — retrain model with new samples
  GET  /labels        — list all known sign labels
  GET  /stats         — model info + sample count
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import os, json, time, logging, pickle

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("isl-backend")

app = Flask(__name__)
CORS(app)  # allow all browser origins

# ── Auth blueprint ────────────────────────────────────────
try:
    from .auth import auth_bp
except ImportError:
    from auth import auth_bp
app.register_blueprint(auth_bp)

# ── Paths ────────────────────────────────────────────────
BASE   = os.path.dirname(__file__)
MODEL  = os.path.join(BASE, "model", "isl_model.pkl")
DATA   = os.path.join(BASE, "data",  "landmark_data.json")
os.makedirs(os.path.dirname(MODEL), exist_ok=True)
os.makedirs(os.path.dirname(DATA),  exist_ok=True)

# ── Model (lazy-load) ────────────────────────────────────
_model = None
_le    = None   # LabelEncoder

def load_model():
    global _model, _le
    if os.path.exists(MODEL):
        with open(MODEL, "rb") as f:
            bundle = pickle.load(f)
        _model = bundle["model"]
        _le    = bundle["label_encoder"]
        log.info(f"Model loaded — {len(_le.classes_)} classes: {list(_le.classes_)}")
    else:
        log.warning("No model found. Run ml/train_model.py first.")

load_model()

# ── Feature extraction ───────────────────────────────────
def to_features(raw: list) -> np.ndarray:
    """
    Normalise 63 raw landmark floats (21 × [x,y,z])
    to wrist-relative, scale-invariant representation.
    """
    pts = np.array(raw, dtype=np.float32).reshape(21, 3)
    pts -= pts[0]                                          # wrist → origin
    scale = np.max(np.linalg.norm(pts, axis=1)) + 1e-6
    pts /= scale
    return pts.flatten()

# ── Routes ───────────────────────────────────────────────

@app.get("/ping")
def ping():
    return jsonify({"status": "ok", "timestamp": time.time(),
                    "model_ready": _model is not None})


@app.post("/predict")
def predict():
    body = request.get_json(silent=True)
    if not body or "landmarks" not in body:
        return jsonify({"error": "Missing 'landmarks' field"}), 400

    lm = body["landmarks"]
    if len(lm) != 63:
        return jsonify({"error": f"Expected 63 values, got {len(lm)}"}), 400

    if _model is None:
        return jsonify({"sign": None, "confidence": 0, "source": "no_model"})

    feat  = to_features(lm).reshape(1, -1)
    proba = _model.predict_proba(feat)[0]
    idx   = int(np.argmax(proba))
    sign  = _le.inverse_transform([idx])[0]
    conf  = float(proba[idx])

    return jsonify({"sign": sign, "confidence": round(conf, 4), "source": "model"})


@app.post("/train")
def train():
    """
    Body: { "samples": [{"landmarks": [63 floats], "label": "A"}, ...] }
    Trains RandomForest and saves model.
    """
    from sklearn.ensemble        import RandomForestClassifier
    from sklearn.preprocessing   import LabelEncoder
    from sklearn.model_selection import cross_val_score

    body = request.get_json(silent=True)
    if not body or "samples" not in body:
        return jsonify({"error": "Missing 'samples'"}), 400

    samples = body["samples"]
    if len(samples) < 10:
        return jsonify({"error": "Need at least 10 samples"}), 400

    X, y = [], []
    for s in samples:
        if len(s.get("landmarks", [])) != 63: continue
        X.append(to_features(s["landmarks"]))
        y.append(s["label"].upper())

    X, y = np.array(X), np.array(y)
    le = LabelEncoder()
    ye = le.fit_transform(y)

    clf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
    clf.fit(X, ye)
    scores = cross_val_score(clf, X, ye, cv=min(5, len(set(y))), scoring="accuracy")

    with open(MODEL, "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le}, f)

    # Save raw data too
    existing = []
    if os.path.exists(DATA):
        with open(DATA) as f:
            existing = json.load(f)
    existing.extend(samples)
    with open(DATA, "w") as f:
        json.dump(existing, f)

    load_model()
    return jsonify({"status": "trained", "samples": len(X),
                    "classes": list(le.classes_),
                    "cv_accuracy": round(float(scores.mean()), 4)})


@app.get("/labels")
def labels():
    return jsonify({"labels": list(_le.classes_) if _le else []})


@app.get("/stats")
def stats():
    n = 0
    if os.path.exists(DATA):
        with open(DATA) as f:
            n = len(json.load(f))
    return jsonify({"model_exists": _model is not None,
                    "n_classes": len(_le.classes_) if _le else 0,
                    "n_samples": n})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
