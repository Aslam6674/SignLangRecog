# 🤟 ISL Decode — Indian Sign Language Recognition

Real-time ISL recognition that runs in any modern browser.  
**MediaPipe Hands** → 21 landmarks → **Rule-based classifier** (instant, browser-only) OR **RandomForest ML model** via Flask backend (higher accuracy after training).

---

## 📁 Project Structure

```
ISL-Decode/
│
├── frontend/                        ← Open in browser — no build step
│   ├── index.html                   ← 3-tab app (Recognize · Learn · About)
│   └── src/
│       ├── styles.css               ← Full design system (dark navy + saffron)
│       ├── isl-data.js              ← 45 ISL signs with Devanagari translations
│       ├── recognizer.js            ← MediaPipe + rule classifier + Flask bridge
│       ├── ui.js                    ← Tabs, grid, sentence builder, history
│       └── app.js                   ← Main entry — wires everything
│
├── backend/                         ← Python Flask REST API
│   ├── app.py                       ← /predict  /train  /labels  /stats  /ping
│   ├── requirements.txt
│   ├── model/                       ← isl_model.pkl saved here after training
│   └── data/                        ← landmark_data.json (backend copy)
│
└── ml/                              ← Data collection + training pipeline
    ├── collect_data.py              ← Webcam collector (OpenCV + MediaPipe)
    ├── preprocess_kaggle.py         ← Convert Kaggle images → landmark JSON
    ├── train_model.py               ← Train RandomForest, save .pkl
    ├── evaluate_model.py            ← Per-class accuracy + confusion matrix
    ├── requirements.txt
    ├── data/                        ← landmark_data.json lives here
    └── reports/                     ← accuracy_report.txt + confusion_matrix.txt
```

---

## 🗂️ Kaggle Datasets

Use any of these datasets with `ml/preprocess_kaggle.py`:

| Dataset | Classes | Best for |
|---------|---------|---------|
| [ISL Hand Landmarks (2024)](https://www.kaggle.com/datasets/eraakash/indian-sign-language-hand-landmarks-dataset) | A–Z, 0–9 | ⭐ Best — already landmark format, skip preprocess |
| [ISL Character Level](https://www.kaggle.com/datasets/prathumarikeri/indian-sign-language-isl) | A–Z, 0–9 | Images — run preprocess_kaggle.py |
| [ISL 36 Classes](https://www.kaggle.com/datasets/ananyaarya22/isl-data) | 0–9, A–Z | Images — run preprocess_kaggle.py |
| [ISL Alphabet (2025)](https://www.kaggle.com/datasets/rushilverma07/indian-sign-language-alphabet-dataset) | A–Z | Images — run preprocess_kaggle.py |

**Quickest path**: Download the **ISL Hand Landmarks** dataset — it's already in landmark CSV format, so you can skip `preprocess_kaggle.py` and go straight to `train_model.py`.

---

## 🚀 Step-by-Step Setup in VS Code

### Prerequisites

| Tool | Download |
|------|---------|
| VS Code | https://code.visualstudio.com |
| Python 3.10–3.12 | https://python.org |
| Live Server (VS Code extension) | VS Code marketplace |

---

### STEP 1 — Open project in VS Code

```bash
# In your terminal:
code ISL-Decode
```

---

### STEP 2 — Install Live Server extension

1. Press `Ctrl+Shift+X`
2. Search **"Live Server"** by Ritwick Dey
3. Click **Install**

---

### STEP 3 — Run the frontend immediately (no Python needed)

1. In VS Code Explorer, right-click `frontend/index.html`
2. Select **"Open with Live Server"**
3. Browser opens at `http://127.0.0.1:5500/frontend/`
4. Click **▶ Start Camera** → allow camera permission → show an ISL sign

> ✅ **Works right now** — the rule-based recognizer covers A–Z and 0–10  
> entirely in the browser. Backend adds higher accuracy after training.

---

### STEP 4 — Set up Python virtual environment

Open the VS Code terminal (`Ctrl+` ` `):

```bash
# Create venv
python -m venv venv

# Activate — Windows:
venv\Scripts\activate

# Activate — macOS / Linux:
source venv/bin/activate
```

---

### STEP 5 — Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

---

### STEP 6 — Run the Flask backend

```bash
cd backend
python app.py
```

Expected output:
```
 * Running on http://0.0.0.0:5000
 * No model found. Run ml/train_model.py first.
```

The frontend auto-detects the backend. If it's running, predictions use the ML model. If not, it falls back to the rule-based classifier automatically.

---

### STEP 7 — Get a Kaggle dataset

**Option A — ISL Hand Landmarks (recommended, fastest)**

1. Go to https://www.kaggle.com/datasets/eraakash/indian-sign-language-hand-landmarks-dataset
2. Click **Download**
3. Unzip — you'll get a CSV file with columns `x0..x20, y0..y20, z0..z20, label`
4. Convert CSV → JSON:

```bash
cd ml
pip install -r requirements.txt
python - <<'EOF'
import pandas as pd, json, os
df  = pd.read_csv("path/to/downloaded.csv")
out = []
for _, row in df.iterrows():
    lm = []
    for i in range(21):
        lm += [row[f"x{i}"], row[f"y{i}"], row[f"z{i}"]]
    out.append({"label": str(row["label"]).upper(), "landmarks": lm})
os.makedirs("data", exist_ok=True)
json.dump(out, open("data/landmark_data.json","w"), indent=2)
print(f"Saved {len(out)} samples")
EOF
```

**Option B — Image-based datasets (ISL Character Level / ISL 36 Classes / ISL Alphabet)**

1. Download and unzip the dataset — you'll see folders named A/, B/, C/ etc.
2. Run the preprocessor:

```bash
cd ml
pip install -r requirements.txt
python preprocess_kaggle.py --dataset /path/to/unzipped/dataset --skip-errors
```

This extracts MediaPipe landmarks from each image (~5–20 min for large datasets).

**Option C — Collect your own data from webcam**

```bash
cd ml
pip install -r requirements.txt
python collect_data.py
```

Controls: press a letter key to set the sign label, then `SPACE` to capture, `S` to save.

---

### STEP 8 — Train the model

```bash
cd ml
python train_model.py
```

Expected output:
```
[1/5] Loading: ml/data/landmark_data.json
[2/5] Classes (36): {'A': 200, 'B': 198, ...}
[3/5] Training RandomForest on 5800 samples...
[4/5] Evaluating...
  Test accuracy : 94.2%
  CV accuracy   : 93.8% ± 1.2%
[5/5] Saving model → backend/model/isl_model.pkl
✅  Training complete!
```

---

### STEP 9 — Reload backend + use the app

```bash
# Stop the backend (Ctrl+C), then restart:
cd backend
python app.py
```

The backend now loads the trained model. The frontend status chip turns **green** when connected.

---

### STEP 10 — Evaluate model accuracy

```bash
cd ml
python evaluate_model.py
```

Reports saved to `ml/reports/`.

---

## ⌨️ Keyboard Shortcuts (Frontend)

| Key | Action |
|-----|--------|
| `Space` | Add detected sign to sentence |
| `S` | Speak current sign aloud |
| `R` | Toggle camera on/off |

---

## 🔌 Backend API

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET | `/ping` | — | `{status, model_ready}` |
| POST | `/predict` | `{landmarks: [63 floats]}` | `{sign, confidence}` |
| POST | `/train` | `{samples: [...]}` | `{status, cv_accuracy}` |
| GET | `/labels` | — | `{labels: [...]}` |
| GET | `/stats` | — | `{model_exists, n_classes, n_samples}` |

---

## 🎯 Tips for Best Accuracy

- Plain background (white wall, sheet of paper)
- Good lighting — avoid strong backlight
- Hand 30–60 cm from camera
- Hold each sign steady for 1–2 seconds
- Collect training samples in different lighting conditions for robustness

---

## 📜 License

MIT — free to use, extend, and distribute.
