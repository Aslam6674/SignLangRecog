"""
ml/collect_data.py
────────────────────────────────────────────────────
ISL Training Data Collector
Opens your webcam, detects hand landmarks with
MediaPipe, and saves samples to a JSON file.

Usage:
  python collect_data.py

Controls (while webcam window is open):
  [A–Z]  — set label for the sign you're about to show
  [0–9]  — set a number label
  SPACE  — capture current frame as one training sample
  S      — save all captured data to disk
  Q/ESC  — quit (auto-prompts to save)

Aim: ~80–100 samples per sign for good accuracy.
────────────────────────────────────────────────────
"""

import cv2
import mediapipe as mp
import numpy as np
import json, os, time
from datetime import datetime

# ── Config ───────────────────────────────────────
OUT_DIR   = os.path.join(os.path.dirname(__file__), "data")
OUT_FILE  = os.path.join(OUT_DIR, "landmark_data.json")
TARGET    = 100          # target samples per sign
os.makedirs(OUT_DIR, exist_ok=True)

# ── MediaPipe ────────────────────────────────────
mp_hands  = mp.solutions.hands
mp_draw   = mp.solutions.drawing_utils
mp_styles = mp.solutions.drawing_styles

# ── State ────────────────────────────────────────
samples        = []
current_label  = "A"
last_flash     = 0

def load_existing():
    if os.path.exists(OUT_FILE):
        with open(OUT_FILE) as f:
            return json.load(f)
    return []

def save(data):
    with open(OUT_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  [SAVED] {len(data)} total samples → {OUT_FILE}")

def count_per_class(data):
    c = {}
    for s in data:
        c[s["label"]] = c.get(s["label"], 0) + 1
    return c

def lm_to_flat(hl):
    return [v for lm in hl.landmark for v in (lm.x, lm.y, lm.z)]

def draw_hud(frame, label, counts, hand_ok):
    h, w = frame.shape[:2]
    # Dark strip at top
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 110), (12, 18, 38), -1)
    cv2.addWeighted(overlay, 0.82, frame, 0.18, 0, frame)

    n = counts.get(label, 0)
    col_ok   = (52, 211, 153)
    col_warn = (100, 100, 120)
    col_saf  = (22, 115, 249)    # BGR for saffron

    cv2.putText(frame, f"Label: {label}", (14, 36),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, col_saf, 2)
    cv2.putText(frame, f"{'Hand detected' if hand_ok else 'No hand visible'}",
                (14, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.65,
                col_ok if hand_ok else col_warn, 1)
    cv2.putText(frame, f"Samples [{label}]: {n}/{TARGET}",
                (14, 96), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (200, 200, 220), 1)
    cv2.putText(frame, "SPACE=capture  S=save  [A-Z/0-9]=label  Q=quit",
                (14, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (80, 100, 140), 1)

    # Green flash after capture
    if time.time() - last_flash < 0.14:
        cv2.rectangle(frame, (0, 0), (w, h), col_ok, 5)
    return frame


def main():
    global current_label, last_flash, samples

    all_data = load_existing()
    samples  = list(all_data)
    counts   = count_per_class(samples)
    print(f"Loaded {len(all_data)} existing samples")
    if counts:
        print(f"Counts: {counts}")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Cannot open webcam"); return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    with mp_hands.Hands(
        static_image_mode=False, max_num_hands=1,
        min_detection_confidence=0.72, min_tracking_confidence=0.65
    ) as hands:
        while True:
            ret, frame = cap.read()
            if not ret: break

            frame  = cv2.flip(frame, 1)
            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)
            hand_ok = bool(result.multi_hand_landmarks)

            if hand_ok:
                for hl in result.multi_hand_landmarks:
                    mp_draw.draw_landmarks(
                        frame, hl, mp_hands.HAND_CONNECTIONS,
                        mp_styles.get_default_hand_landmarks_style(),
                        mp_styles.get_default_hand_connections_style())

            counts = count_per_class(samples)
            frame  = draw_hud(frame, current_label, counts, hand_ok)
            cv2.imshow("ISL Data Collector", frame)
            key = cv2.waitKey(1) & 0xFF

            if key in (ord('q'), 27):
                break
            elif key == ord('s'):
                save(samples)
            elif key == ord(' '):
                if hand_ok:
                    flat = lm_to_flat(result.multi_hand_landmarks[0])
                    samples.append({"label": current_label, "landmarks": flat,
                                    "ts": datetime.now().isoformat()})
                    last_flash = time.time()
                    n = counts.get(current_label, 0) + 1
                    print(f"  Captured [{current_label}] — {n} samples")
                else:
                    print("  No hand detected — nothing captured")
            elif ord('a') <= key <= ord('z'):
                current_label = chr(key).upper()
                print(f"  Label → {current_label}")
            elif ord('0') <= key <= ord('9'):
                current_label = chr(key)
                print(f"  Label → {current_label}")

    cap.release()
    cv2.destroyAllWindows()

    if samples:
        ans = input(f"\nSave {len(samples)} samples? [Y/n] ").strip().lower()
        if ans != 'n':
            save(samples)


if __name__ == "__main__":
    main()
