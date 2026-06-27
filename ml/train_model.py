"""
ml/train_model.py
────────────────────────────────────────────────────────────────────
Train the ISL Recognition model from collected landmark data.

Input  : ml/data/landmark_data.json   (from collect_data.py or preprocess_kaggle.py)
Output : backend/model/isl_model.pkl  (auto-loaded by Flask backend on startup)
         ml/reports/confusion_matrix.txt
         ml/reports/accuracy_report.txt

Usage:
  python train_model.py
  python train_model.py --data ml/data/landmark_data.json --out backend/model/isl_model.pkl
────────────────────────────────────────────────────────────────────
"""

import os, json, argparse, pickle, time
import numpy as np

from sklearn.ensemble        import RandomForestClassifier
from sklearn.preprocessing   import LabelEncoder
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics         import classification_report, confusion_matrix, accuracy_score

# ── Paths ────────────────────────────────────────────────
BASE         = os.path.dirname(os.path.abspath(__file__))
REPO         = os.path.dirname(BASE)
DEFAULT_DATA = os.path.join(BASE,  "data",  "landmark_data.json")
DEFAULT_OUT  = os.path.join(REPO,  "backend", "model", "isl_model.pkl")
REPORT_DIR   = os.path.join(BASE,  "reports")
os.makedirs(REPORT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DEFAULT_OUT), exist_ok=True)

# ── Feature extraction ───────────────────────────────────
def extract(raw: list) -> np.ndarray:
    """Wrist-relative, scale-invariant 63-float feature vector."""
    pts = np.array(raw, dtype=np.float32).reshape(21, 3)
    pts -= pts[0]
    scale = np.max(np.linalg.norm(pts, axis=1)) + 1e-6
    pts  /= scale
    return pts.flatten()


def load_data(path: str):
    with open(path) as f:
        raw = json.load(f)

    X, y, skipped = [], [], 0
    for s in raw:
        lm = s.get("landmarks", [])
        lb = s.get("label", "")
        if len(lm) != 63 or not lb:
            skipped += 1
            continue
        X.append(extract(lm))
        y.append(lb.upper())

    print(f"  Loaded {len(X)} samples  ({skipped} skipped)")
    return np.array(X), np.array(y)


# ── Train ────────────────────────────────────────────────
def train(data_path: str, out_path: str):
    print("=" * 56)
    print("  ISL Decode — Model Training")
    print("=" * 56)

    # 1. Load
    print(f"\n[1/5] Loading: {data_path}")
    X, y = load_data(data_path)

    classes, counts = np.unique(y, return_counts=True)
    print(f"[2/5] Classes ({len(classes)}): {dict(zip(classes, counts))}")

    # Filter classes with fewer than 5 samples
    keep  = classes[counts >= 5]
    mask  = np.isin(y, keep)
    X, y  = X[mask], y[mask]
    print(f"      After filter: {len(X)} samples across {len(keep)} classes")

    if len(X) < 20:
        print("ERROR: Not enough data. Collect more samples first.")
        return

    # 2. Encode + split
    le   = LabelEncoder()
    ye   = le.fit_transform(y)
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, ye, test_size=0.2, stratify=ye, random_state=42)

    # 3. Train
    print(f"\n[3/5] Training RandomForest on {len(X_tr)} samples…")
    t0  = time.time()
    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_tr, y_tr)
    print(f"      Done in {time.time()-t0:.1f}s")

    # 4. Evaluate
    print(f"\n[4/5] Evaluating on {len(X_te)} test samples…")
    y_pred = clf.predict(X_te)
    acc    = accuracy_score(y_te, y_pred)
    print(f"\n  Test accuracy : {acc*100:.1f}%")

    cv    = StratifiedKFold(n_splits=min(5, len(set(ye))), shuffle=True, random_state=42)
    cvs   = cross_val_score(clf, X, ye, cv=cv, scoring="accuracy")
    print(f"  CV accuracy   : {cvs.mean()*100:.1f}% ± {cvs.std()*100:.1f}%")

    report = classification_report(y_te, y_pred, target_names=le.classes_)
    cm     = confusion_matrix(y_te, y_pred)

    # Save reports
    with open(os.path.join(REPORT_DIR, "accuracy_report.txt"), "w") as f:
        f.write(f"Test accuracy: {acc:.4f}\n")
        f.write(f"CV accuracy : {cvs.mean():.4f} ± {cvs.std():.4f}\n\n")
        f.write(report)
    with open(os.path.join(REPORT_DIR, "confusion_matrix.txt"), "w") as f:
        f.write(f"Classes: {list(le.classes_)}\n\n{cm}")

    # 5. Save model
    print(f"\n[5/5] Saving model → {out_path}")
    bundle = {
        "model":         clf,
        "label_encoder": le,
        "accuracy":      float(acc),
        "cv_mean":       float(cvs.mean()),
        "classes":       list(le.classes_),
        "n_train":       int(len(X_tr)),
        "n_test":        int(len(X_te)),
    }
    with open(out_path, "wb") as f:
        pickle.dump(bundle, f)

    print("\n" + "=" * 56)
    print(f"  ✅  Training complete!")
    print(f"  Model  : {out_path}")
    print(f"  Classes: {list(le.classes_)}")
    print(f"  Accuracy: {acc*100:.1f}%")
    print("=" * 56)
    print("\nRestart the Flask backend to load the new model.")


# ── Entry point ──────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Train ISL sign recognizer")
    ap.add_argument("--data", default=DEFAULT_DATA)
    ap.add_argument("--out",  default=DEFAULT_OUT)
    args = ap.parse_args()

    if not os.path.exists(args.data):
        print(f"ERROR: No training data at {args.data}")
        print("Run one of:")
        print("  python ml/collect_data.py          (collect from webcam)")
        print("  python ml/preprocess_kaggle.py ... (use Kaggle dataset)")
        return

    train(args.data, args.out)

if __name__ == "__main__":
    main()
