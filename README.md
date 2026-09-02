# CareVoice: AI Skin Disease Detection & Multi-Modal Healthcare System

### 🌐 Live Cloud Deployment
- **Production Web Application**: [https://ai-skin-disease-detection.vercel.app](https://ai-skin-disease-detection.vercel.app)
- **FastAPI Health Endpoint**: [https://ai-skin-disease-detection.vercel.app/api/health](https://ai-skin-disease-detection.vercel.app/api/health)

---

## 📖 Overview

**CareVoice** is a full-stack, multimodal AI healthcare assistant and dermatological diagnostic application. It combines deep learning computer vision (**EfficientNet-B0 ONNX**), natural language processing (**MiniLM Transformer**), and multi-modal fusion with real-time health services including hospital location routing, clinic appointment booking, voice speech recognition, and automated medication reminders.

---

## ✨ Key Features

1. **🔬 18-Class Multimodal Skin Disease Diagnostic AI**:
   - Classifies 18 distinct dermatological conditions (Melanoma, Eczema, Psoriasis, Acne, Basal Cell Carcinoma, Ringworm, etc.).
   - Calibrated probability confidence scoring.
   - **Grad-CAM Heatmaps**: Explainable AI overlay with interactive split-screen slider.
   - **Lesion Detection & Counting**: Detects and highlights acne pimples (`🔴 P`) and dark spots (`🔵 S`) with coordinate markers.
   - **Severity Gauge**: Mild, Moderate, and Severe classification with clinical rationale.

2. **🎙️ Multilingual Voice & Optional Symptoms**:
   - Symptoms are **100% optional** (model analyzes images with or without symptoms).
   - Real-time Speech-to-Text Microphone support in **English (`en-US`)**, **Hindi (`hi-IN`)**, **Kannada (`kn-IN`)**, and **Tamil (`ta-IN`)**.
   - Editable transcription box before running analysis.

3. **📍 Care Connect: Hospital Timings & Appointment Booking**:
   - Real-time GPS location lock with manual city search fallback.
   - Interactive Leaflet OpenStreetMap pins.
   - Real clinic opening hours (e.g., `Mon-Sat: 08:30 AM – 06:30 PM (Emergency 24/7)`) and `Open Now` status badges.
   - On-duty specialist dermatologist names.
   - **Interactive Appointment Booking Modal**: Pick date and time slots (`09:30 AM`, `11:00 AM`, `02:30 PM`, `04:00 PM`, etc.).
   - **My Booked Appointments**: Manage confirmed bookings with cancellation options.
   - Direct Google Maps Navigation (`Map`) and direct calling (`Call`).

4. **📊 Skin Diary & Progress Analytics**:
   - **Baseline vs. Latest Comparison**: Side-by-side progression analysis.
   - **SVG Trend Line Chart**: Tracks blemish count changes over time.

5. **💊 Medication Reminders & Health Reports**:
   - Register medicines with dosage and schedule times.
   - Upload and download clinical laboratory reports and medical records.
   - Automated PDF Clinical Report generator with patient name, symptoms, images, and care instructions.

6. **🚨 Emergency SOS System**:
   - Instant coordinate dispatch alert for acute emergencies.
   - One-tap 911 emergency calling.

7. **🎨 UI / UX & Multi-Language Support**:
   - Dark Mode / Light Mode toggle.
   - Multilingual interface supporting English, Hindi, Kannada, and Tamil.

---

## 🏛️ System Architecture

```
                               ┌────────────────────────┐
                               │   React Frontend UI    │
                               │ (Vite + Tailwind CSS)  │
                               └───────────┬────────────┘
                                           │ HTTPS / REST
                               ┌───────────▼────────────┐
                               │   FastAPI ONNX Backend │
                               └─────┬───────┬──────────┘
                                     │       │
            ┌────────────────────────┴─┐   ┌─┴────────────────────────┐
            │   AI Inference Pipeline  │   │     Healthcare Services  │
            ├──────────────────────────┤   ├──────────────────────────┤
            │ • EfficientNet-B0 (CNN)  │   │ • SQLite Database        │
            │ • MiniLM Text Encoder    │   │ • Geolocation & Leaflet  │
            │ • Multimodal Fusion      │   │ • Appointment Booking    │
            │ • Grad-CAM Heatmap Gen   │   │ • Medicine Reminders     │
            │ • Lesion Feature Counter │   │ • ReportLab PDF Compiler │
            └──────────────────────────┘   └──────────────────────────┘
```

---

## 📂 Project Directory Structure

```
ai-skin-disease-detection/
├── api/                       # Vercel serverless entrypoint
│   ├── index.py
│   └── requirements.txt
├── backend/
│   └── app/
│       ├── models/            # ONNX models (EfficientNet-B0, Text, Fusion)
│       │   └── checkpoints/   # Trained ONNX weights & metrics.json
│       ├── services/          # Location, ReportLab PDF generation
│       │   ├── location.py    # Clinic timings & hospital databases
│       │   └── pdf_report.py  # Clinical PDF generator
│       ├── utils/             # SQLite DB, translation, image validation
│       │   ├── db.py          # SQLite schema (users, appointments, meds)
│       │   └── helpers.py     # Multilingual Google Translate helper
│       └── onnx_main.py       # FastAPI application endpoints
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React Dashboard & Modals
│   │   ├── config.js          # API origin configuration
│   │   └── index.css          # Styling & dark mode variables
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── tests/
│   ├── test_carevoice_api.py  # Local integration test suite
│   └── test_live_vercel.py    # Production deployment tests
└── README.md
```

---

## 💻 Local Development Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git

### 1. Run Backend:
```powershell
python -m uvicorn backend.app.main:app --port 8000 --reload
```

### 2. Run Frontend:
```powershell
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173`.

### 3. Run Tests:
```powershell
python tests/test_carevoice_api.py
```
