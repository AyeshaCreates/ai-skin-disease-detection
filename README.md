# AI Skin Disease Detection System using Multi-Modal AI

### 🌐 Live Public HTTPS Deployment
- **Web Application Portal**: [https://629fb8009559ee71-49-37-181-20.serveousercontent.com](https://629fb8009559ee71-49-37-181-20.serveousercontent.com)
- **FastAPI API Swagger Docs**: [https://629fb8009559ee71-49-37-181-20.serveousercontent.com/docs](https://629fb8009559ee71-49-37-181-20.serveousercontent.com/docs)

*Note: The frontend is served directly from the same unified server. Anyone can access this portal from any device.*

---

Dermasynth is a production-ready, deployable AI healthcare web application built from scratch for a B.E. Final Year Engineering project. It performs multi-modal dermatological classification by fusing visual features from **skin lesion photographs** and linguistic features from **multilingual symptom descriptions** (supporting English, Hindi, and Kannada, both typed and spoken).

---

## 1. System Architecture

The application is split into a Python FastAPI backend and a Vite + React + Tailwind CSS frontend.

- **Image processing**: Pretrained **EfficientNetB0** CNN model extracts a 1280-dimensional feature vector and uses **Grad-CAM** backpropagation hooks to compute clinical heatmap overlays.
- **Symptom processing**: Semantic embeddings of **384 dimensions** are extracted from English, Hindi, or Kannada sentences via a multilingual **MiniLM Transformer** (with an offline keyword random projection fallback).
- **Feature Fusion**: A joint fully-connected network fuses visual and textual vectors (1664 dimensions total) to classify the disease type and determine clinical severity (Mild, Moderate, Severe).
- **Dermatologist Routing**: Queries Nominatim and OpenStreetMap Overpass APIs to dynamically resolve nearby clinics within a 10km radius of the user's GPS/selected city.
- **Report Generation**: Dynamically compiles a downloadable PDF report including Grad-CAM maps, severity gauges, and recommended hospitals using ReportLab.

See the detailed [Architecture Documentation](doc/architecture.md) and [Model Documentation](doc/model_documentation.md).

---

## 2. Project Directory Structure

```
ai-skin-disease-detection/
├── backend/
│   ├── app/
│   │   ├── models/            # EfficientNetB0 CNN, MiniLM text encoder, Fusion Network
│   │   ├── services/          # Data download, model training, OSM routing, ReportLab PDF
│   │   ├── utils/             # Helper tools, offline translation dictionaries
│   │   └── main.py            # FastAPI REST endpoints
│   ├── requirements.txt       # Backend dependencies
│   └── run_backend.ps1        # PowerShell backend runner script
├── frontend/
│   ├── src/
│   │   ├── components/        # SpeechRecorder, interactive widgets
│   │   ├── App.jsx            # Multi-page main dashboard
│   │   └── index.css          # Styling & Outfit/Inter fonts loader
│   ├── tailwind.config.js     # Medical-themed Tailwind configuration
│   ├── index.html             # Entry HTML + Leaflet CSS CDN loader
│   └── run_frontend.ps1       # PowerShell frontend runner script
├── tests/
│   └── test_backend.py        # PyTest integration & model unit tests
└── doc/                       # Full technical specs (architecture, API, models)
```

---

## 3. Local Installation & Setup

### Prerequisites
- Python 3.8+ (Verified on Python 3.14)
- Node.js 18+ (Verified on Node v24)
- Git

### Quick Start (PowerShell on Windows)
1. **Clone the repository**:
   ```powershell
   git clone <repository_url> ai-skin-disease-detection
   cd ai-skin-disease-detection
   ```
2. **Start Backend**:
   Open a PowerShell terminal and run:
   ```powershell
   cd backend
   .\run_backend.ps1
   ```
   *Note: On first boot, if model weights are missing, the backend will automatically download training images from the ISIC Archive API (or generate high-fidelity synthetic fallbacks if offline) and run training for 3 epochs to generate the required model checkpoints (`cnn_model.pth`, `fusion_model.pth`, `metrics.json`).*

3. **Start Frontend**:
   Open a separate PowerShell terminal and run:
   ```powershell
   cd frontend
   .\run_frontend.ps1
   ```
   Visit the application at: `http://localhost:5173`.

---

## 4. Running Tests

To verify all system modules, run the integration and unit tests:
```powershell
pytest tests/test_backend.py
```
This runs checks verifying that the image CNN output dimensions, text transformer embeddings, fusion layer feedforward matrices, distance calculation logic, and ReportLab PDF compilers are completely operational.

---

## 5. Academic Details
- **Project Title**: AI Skin Disease Detection System using Multi-Modal Artificial Intelligence
- **Degree**: Bachelor of Engineering (B.E.) in Computer Science & Engineering
- **Implementation**: B.E. Final Year Project Submission
