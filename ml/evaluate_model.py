"""
ml/evaluate_model.py
────────────────────────────────────────────────────────
Evaluate the trained ISL model on a held-out test set.
Prints per-class accuracy, overall accuracy, and
saves a confusion matrix text report.

Usage:
  python evaluate_model.py
  python evaluate_model.py --model backend/model/isl_model.pkl
                           --data  ml/data/landmark_data.json
────────────────────────────────────────────────────────
"""

import os, json, argparse, pickle
import numpy as np
from sklearn.metrics import (classification_report, confusion_matrix,
                              accuracy_score)
from sklearn.model_selection import train_test_split

BASE         = os.path.dirname(os.path.abspath(__file__))
REPO         = os.path.dirname(BASE)
DEFAULT_DATA = os.path.join(BASE, "data",  "landmark_data.json")
DEFAULT_MDL  = os.path.join(REPO, "backend", "model", "isl_model.pkl")
REPORT_DIR   = os.path.join(BASE, "reports")
os.makedirs(REPORT_DIR, exist_ok=True)


def extract(raw):
    pts = np.array(raw, dtype=np.float32).reshape(21, 3)
    pts -= pts[0]
    pts /= np.max(np.linalg.norm(pts, axis=1)) + 1e-6
    return pts.flatten()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MDL)
    ap.add_argument("--data",  default=DEFAULT_DATA)
    ap.add_argument("--test-split", type=float, default=0.2)
    args = ap.parse_args()

    # Load model
    if not os.path.exists(args.model):
        print(f"Model not found: {args.model}  →  Run train_model.py first"); return
    with open(args.model, "rb") as f:
        bundle = pickle.load(f)
    model = bundle["model"]
    le    = bundle["label_encoder"]
    print(f"Model loaded — {len(le.classes_)} classes: {list(le.classes_)}")

    # Load data
    if not os.path.exists(args.data):
        print(f"Data not found: {args.data}"); return
    with open(args.data) as f:
        raw = json.load(f)

    X, y = [], []
    for s in raw:
        if len(s.get("landmarks", [])) != 63: continue
        X.append(extract(s["landmarks"]))
        y.append(s["label"].upper())
    X, y = np.array(X), np.array(y)

    # Filter to known classes
    mask = np.isin(y, le.classes_)
    X, y = X[mask], y[mask]
    ye   = le.transform(y)

    _, X_te, _, y_te = train_test_split(
        X, ye, test_size=args.test_split, stratify=ye, random_state=42)

    y_pred = model.predict(X_te)
    acc    = accuracy_score(y_te, y_pred)

    print(f"\n{'='*52}")
    print(f"  Test accuracy: {acc*100:.2f}%  ({len(X_te)} samples)")
    print(f"{'='*52}")
    print(classification_report(y_te, y_pred, target_names=le.classes_))

    cm = confusion_matrix(y_te, y_pred)
    rpt_path = os.path.join(REPORT_DIR, "eval_report.txt")
    with open(rpt_path, "w") as f:
        f.write(f"Accuracy: {acc:.4f}\n\n")
        f.write(classification_report(y_te, y_pred, target_names=le.classes_))
        f.write(f"\nConfusion matrix (classes: {list(le.classes_)}):\n{cm}\n")
    print(f"Report saved → {rpt_path}")


if __name__ == "__main__":
    main()
