"""
ml/preprocess_kaggle.py
────────────────────────────────────────────────────────────────────
Convert a Kaggle ISL image dataset into MediaPipe landmark data
that the train_model.py script can use.

Supported Kaggle datasets (all work with this script):
  • https://www.kaggle.com/datasets/eraakash/indian-sign-language-hand-landmarks-dataset
  • https://www.kaggle.com/datasets/prathumarikeri/indian-sign-language-isl
  • https://www.kaggle.com/datasets/ananyaarya22/isl-data
  • https://www.kaggle.com/datasets/rushilverma07/indian-sign-language-alphabet-dataset

Expected folder layout after unzipping:
  dataset/
    A/  img1.jpg  img2.jpg ...
    B/  img1.jpg ...
    ...

Usage:
  python preprocess_kaggle.py --dataset /path/to/dataset --out ml/data/landmark_data.json

Options:
  --dataset PATH   Root of the unzipped Kaggle dataset (required)
  --out     PATH   Output JSON path (default: ml/data/landmark_data.json)
  --limit   N      Max images per class (default: 200, use 0 for all)
  --skip-errors    Skip images where no hand is detected instead of stopping
────────────────────────────────────────────────────────────────────
"""

import cv2
import mediapipe as mp
import numpy as np
import json, os, argparse, time
from pathlib import Path

# ── MediaPipe ────────────────────────────────────────────
mp_hands = mp.solutions.hands

def lm_to_flat(hl) -> list:
    return [v for lm in hl.landmark for v in (lm.x, lm.y, lm.z)]

def process_image(path: str, hands) -> list | None:
    """Returns flat 63-float list or None if no hand detected."""
    img = cv2.imread(path)
    if img is None:
        return None
    rgb  = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res  = hands.process(rgb)
    if res.multi_hand_landmarks:
        return lm_to_flat(res.multi_hand_landmarks[0])
    # Try flipping if first attempt failed
    rgb2 = cv2.flip(rgb, 1)
    res2 = hands.process(rgb2)
    if res2.multi_hand_landmarks:
        return lm_to_flat(res2.multi_hand_landmarks[0])
    return None


def run(dataset_root: str, out_path: str, limit: int, skip_errors: bool):
    root = Path(dataset_root)
    if not root.exists():
        print(f"ERROR: Dataset path not found: {dataset_root}")
        return

    # Find all class folders
    class_dirs = sorted([d for d in root.iterdir() if d.is_dir()])
    if not class_dirs:
        print(f"ERROR: No subdirectories found in {dataset_root}")
        print("  Expected structure: dataset/A/img.jpg, dataset/B/img.jpg ...")
        return

    print(f"Found {len(class_dirs)} classes: {[d.name for d in class_dirs]}")
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    # Load existing data so we can append
    existing = []
    if os.path.exists(out_path):
        with open(out_path) as f:
            existing = json.load(f)
        print(f"Loaded {len(existing)} existing samples from {out_path}")

    samples = list(existing)
    IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.6,
    ) as hands:

        total_ok = 0
        total_skip = 0

        for cls_dir in class_dirs:
            label = cls_dir.name.upper()
            images = [p for p in sorted(cls_dir.iterdir())
                      if p.suffix.lower() in IMG_EXT]

            if limit > 0:
                images = images[:limit]

            ok = skip = 0
            t0 = time.time()

            for img_path in images:
                flat = process_image(str(img_path), hands)
                if flat is None:
                    skip += 1
                    if not skip_errors and skip > 10:
                        print(f"  [{label}] Too many failures — use --skip-errors flag")
                        break
                    continue
                samples.append({"label": label, "landmarks": flat,
                                 "source": "kaggle", "file": img_path.name})
                ok += 1

            elapsed = time.time() - t0
            print(f"  [{label}]  {ok} extracted,  {skip} no-hand  ({elapsed:.1f}s)")
            total_ok   += ok
            total_skip += skip

    # Save
    with open(out_path, "w") as f:
        json.dump(samples, f, indent=2)

    print(f"\n✅  Done!  {total_ok} samples extracted, {total_skip} skipped")
    print(f"   Saved → {out_path}")
    print(f"   Total samples in file: {len(samples)}")


def main():
    ap = argparse.ArgumentParser(description="Convert Kaggle ISL images → landmark JSON")
    ap.add_argument("--dataset",     required=True, help="Path to unzipped Kaggle dataset root")
    ap.add_argument("--out",         default=os.path.join(os.path.dirname(__file__), "data", "landmark_data.json"),
                                     help="Output JSON path")
    ap.add_argument("--limit",       type=int, default=200,
                                     help="Max images per class (0 = no limit)")
    ap.add_argument("--skip-errors", action="store_true",
                                     help="Skip images with no hand detected")
    args = ap.parse_args()
    run(args.dataset, args.out, args.limit, args.skip_errors)

if __name__ == "__main__":
    main()
