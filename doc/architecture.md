# System Architecture

The AI Skin Disease Detection System is built on a decoupled full-stack architecture, featuring a FastAPI backend serving deep learning inference pipelines and a React SPA frontend for interactive user engagement.

## Architectural Diagram

```mermaid
graph TD
    %% User Inputs
    UserImage[Uploaded Skin Image] --> ImagePipeline[Image Processing Pipeline]
    UserSymptoms[Symptom Description (Audio/Text)] --> TextPipeline[NLP Processing Pipeline]
    
    %% Image Pipeline
    subgraph Image CNN Pipeline
        ImagePipeline --> Resize[Resize & Normalize 224x224]
        Resize --> EfficientNet[EfficientNetB0 Backbone]
        EfficientNet --> ImageFeature[1280-dim Visual Feature Vector]
    end
    
    %% Text Pipeline
    subgraph NLP Transformer Pipeline
        TextPipeline --> LanguageSelector{Language Selector}
        LanguageSelector -->|EN| Embed[MiniLM Multilingual Encoder]
        LanguageSelector -->|HI / KN| Translate[Translate to EN / Direct Encoding]
        Translate --> Embed
        Embed --> TextFeature[384-dim Linguistic Feature Vector]
    end
    
    %% Multi-Modal Fusion
    ImageFeature --> FusionLayer[Multi-Modal Feature Fusion Network]
    TextFeature --> FusionLayer
    
    %% Joint Head Outputs
    subgraph Joint Classification Head
        FusionLayer --> FCGrad[Fully Connected Classifier Layers]
        FCGrad --> DiseasePred[Disease Classification]
        FCGrad --> SeverityPred[Severity Classifier]
    end
    
    %% Explainable AI
    EfficientNet --> GradCAM[Grad-CAM Hooking Layer]
    DiseasePred --> GradCAM
    GradCAM --> HeatmapOverlay[Heatmap Overlay Visualizer]
    
    %% Services
    DiseasePred --> ReportService[PDF Report Lab Service]
    SeverityPred --> ReportService
    HeatmapOverlay --> ReportService
    
    UserGPS[User Location Coordinates / City] --> Geocoding[Nominatim OSM Geocoding]
    Geocoding --> OSMOverpass[OSM Overpass Hospital Query]
    OSMOverpass --> HospitalList[Hospital Recommendations]
    
    %% Delivery
    ReportService --> ClientDownload[Downloadable PDF Report]
    HospitalList --> ClientMap[Interactive Leaflet Map]
```

## System Workflow Description

1. **Intake**: The user uploads a dermoscopic photograph of their skin condition and provides symptoms via typing or speech in English, Hindi, or Kannada.
2. **Translation / Transcription**: Speech is dynamically transcribed on the client side using the browser's Web Speech API. If input is Hindi/Kannada, it is processed via the multilingual MiniLM model natively, and translated for formatting.
3. **Visual Processing**: The image is fed into a pre-trained EfficientNetB0 CNN, which extracts a 1280-dimensional visual feature vector representing lesion pathology.
4. **Textual Processing**: Text input is fed into a multilingual Transformer (MiniLM) to extract a 384-dimensional semantic embedding vector.
5. **Feature Fusion**: Both feature vectors are concatenated into a joint 1664-dimensional multimodal vector.
6. **Classification & Severity**: The combined vector is passed through fully-connected layers to classify the disease into one of five categories and predict severity (Mild, Moderate, Severe).
7. **Explainable AI (Grad-CAM)**: The target class score is backpropagated to the last convolutional layer of the EfficientNet base model. This generates a Grad-CAM heatmap highlighting pathological focus points.
8. **Location Recommendation**: The system geocodes coordinates (via Nominatim) and queries the OpenStreetMap Overpass API to locate nearby dermatology centers within 10km.
9. **Document Assembly**: Prediction metadata, clinical recommendations, Grad-CAM overlays, and hospital maps are compiled into a downloadable PDF report.
