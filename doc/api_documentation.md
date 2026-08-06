# API Documentation

The FastAPI backend exposes standard REST endpoints for diagnostic inference, PDF report generation, hospital routing, and model metrics retrieval.

---

## 1. Health Status
Checks if the server is healthy and running.

- **URL**: `/`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "AI Skin Disease Detection Multi-Modal System"
  }
  ```

---

## 2. Diagnostic Prediction
Submits an image and symptom text to run the multi-modal classification pipeline.

- **URL**: `/api/predict`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Request Parameters**:
  - `image` (File, Required): Skin photograph file.
  - `symptoms` (String, Required): Description of symptoms.
  - `language` (String, Optional): Source language (`en`, `hi`, `kn`). Default is `en`.
  - `lat` (Float, Optional): Patient latitude coordinate.
  - `lon` (Float, Optional): Patient longitude coordinate.
  - `city` (String, Optional): Patient city name.
- **Response**:
  ```json
  {
    "disease": "Melanoma",
    "confidence": 0.892,
    "severity": "Severe",
    "translated_symptoms": "A dark irregular mole changing size...",
    "original_image": "data:image/jpeg;base64,...",
    "heatmap_image": "data:image/jpeg;base64,...",
    "overlay_image": "data:image/jpeg;base64,...",
    "explanation": "Melanoma is a serious skin cancer starting in melanocytes...",
    "recommendations": [
      "CONFIRMED PREDICTION: Highly confident.",
      "Schedule an urgent face-to-face biopsy...",
      "Use broad-spectrum SPF 50+ sunscreen..."
    ],
    "hospitals": [
      {
        "name": "Bangalore Medical College Dermatology Department",
        "distance": "2.4 km",
        "rating": "4.2",
        "phone": "+91 80 2670 1150",
        "lat": 12.9592,
        "lon": 77.5744
      }
    ],
    "location": {
      "lat": 12.9592,
      "lon": 77.5744,
      "city": "Bengaluru"
    }
  }
  ```

---

## 3. PDF Report Generation
Compiles a clinical PDF and streams it to the client for download.

- **URL**: `/api/export-pdf`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "disease": "Atopic Dermatitis (Eczema)",
    "confidence": 0.952,
    "severity": "Moderate",
    "symptoms": "Extremely itchy red rash in elbow creases",
    "language": "en",
    "original_image_b64": "data:image/jpeg;base64,...",
    "heatmap_image_b64": "data:image/jpeg;base64,...",
    "hospitals": [...]
  }
  ```
- **Response**: Streams binary PDF file (`application/pdf`) with header `Content-Disposition: attachment; filename=Skin_Disease_Report_...pdf`.

---

## 4. Model Evaluation Metrics
Retrieves the saved performance statistics from model training.

- **URL**: `/api/metrics`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "accuracy": 0.932,
    "precision": 0.941,
    "recall": 0.932,
    "f1_score": 0.935,
    "confusion_matrix": [
      [5, 0, 1, 0, 0],
      [0, 6, 0, 0, 0],
      ...
    ],
    "classes": [
      "Melanoma",
      "Melanocytic Nevus",
      "Atopic Dermatitis (Eczema)",
      "Seborrheic Keratosis",
      "Acne Vulgaris"
    ],
    "history": {
      "train_loss": [1.23, 0.85, 0.42],
      "val_loss": [1.45, 0.92, 0.58],
      "val_acc": [0.65, 0.81, 0.93]
    }
  }
  ```
