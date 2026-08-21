import os
import shutil
import uuid
import json
import torch
import ssl
import base64

# Bypass SSL certification verification globally for safety on this workspace env
ssl._create_default_https_context = ssl._create_unverified_context

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from PIL import Image

# Import models & services
from backend.app.models.image_model import SkinDiseaseCNN, GradCAM, overlay_heatmap, get_image_transforms
from backend.app.models.text_model import SymptomTextEncoder
from backend.app.models.fusion_model import MultiModalFusionNet
from backend.app.services.training import train_multimodal_system, DISEASE_CLASSES, SEVERITY_LEVELS
from backend.app.services.location import find_nearby_dermatologists, get_coordinates_from_city
from backend.app.services.pdf_report import generate_pdf_report
from backend.app.utils.helpers import translate_symptoms, pil_to_base64

# Initialize FastAPI
app = FastAPI(
    title="AI Skin Disease Detection System API",
    description="Multi-Modal AI Healthcare API combining Image CNN & NLP Transformers.",
    version="1.0"
)

# CORS setup to allow React frontend connection
origins = [
    "https://frontend-nine-ecru-ivt7r5yxm8.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories
TEMP_DIR = "temp_files"
CHECKPOINT_DIR = "backend/app/models/checkpoints"
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

# Global variables for models
cnn_model = None
text_encoder = None
fusion_model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

@app.on_event("startup")
async def startup_event():
    """FastAPI startup handler to train/load the models."""
    global cnn_model, text_encoder, fusion_model
    
    print("Initializing AI Skin Disease Detection models...")
    
    # 1. Initialize text encoder first (downloads or uses fallback)
    text_encoder = SymptomTextEncoder(use_cuda=torch.cuda.is_available())
    
    # 2. Check if checkpoints exist. If not, trigger a fast 3-epoch training run locally.
    # In production (Render), we throw an error instead of running a heavy CPU training loop.
    cnn_path = os.path.join(CHECKPOINT_DIR, "cnn_model.pth")
    fusion_path = os.path.join(CHECKPOINT_DIR, "fusion_model.pth")
    
    if not os.path.exists(cnn_path) or not os.path.exists(fusion_path):
        if os.getenv("RENDER") or os.getenv("STAGE") == "production":
            raise FileNotFoundError(
                f"Model weights not found at {cnn_path} or {fusion_path}. "
                "Ensure checkpoints are committed and available on Render deployment."
            )
        print("Model weights not found. Running end-to-end training and evaluation pipeline...")
        # Train for 3 epochs on startup (fast CPU check)
        train_multimodal_system(epochs=3)
        
    # 3. Load model structures
    cnn_model = SkinDiseaseCNN(num_classes=5, pretrained=True).to(device)
    fusion_model = MultiModalFusionNet(num_classes=5).to(device)
    
    # 4. Load weights
    try:
        cnn_model.load_state_dict(torch.load(cnn_path, map_location=device))
        fusion_model.load_state_dict(torch.load(fusion_path, map_location=device))
        cnn_model.eval()
        fusion_model.eval()
        print("All models loaded successfully and ready for inference.")
        
        # Warm up models to prevent cold-start timeouts
        print("Warming up models with dummy inference...")
        try:
            dummy_img = torch.zeros(1, 3, 224, 224).to(device)
            dummy_text = torch.zeros(1, 384).to(device)
            with torch.no_grad():
                dummy_feat = cnn_model.extract_features(dummy_img)
                fusion_model(dummy_feat, dummy_text)
            print("Model warm-up completed successfully!")
        except Exception as wu_err:
            print(f"Warning: Model warm-up failed: {wu_err}")
            
    except Exception as e:
        if os.getenv("RENDER") or os.getenv("STAGE") == "production":
            raise RuntimeError(f"Failed to load weights in production: {e}")
        print(f"Error loading saved weights: {e}. Re-training model...")
        train_multimodal_system(epochs=3)
        cnn_model.load_state_dict(torch.load(cnn_path, map_location=device))
        fusion_model.load_state_dict(torch.load(fusion_path, map_location=device))
        cnn_model.eval()
        fusion_model.eval()
        
        # Warm up models to prevent cold-start timeouts
        print("Warming up models with dummy inference...")
        try:
            dummy_img = torch.zeros(1, 3, 224, 224).to(device)
            dummy_text = torch.zeros(1, 384).to(device)
            with torch.no_grad():
                dummy_feat = cnn_model.extract_features(dummy_img)
                fusion_model(dummy_feat, dummy_text)
            print("Model warm-up completed successfully!")
        except Exception as wu_err:
            print(f"Warning: Model warm-up failed: {wu_err}")

# Pydantic Schemas
class HospitalRequest(BaseModel):
    lat: float
    lon: float
    city: Optional[str] = None

class PDFRequest(BaseModel):
    disease: str
    confidence: float
    severity: str
    symptoms: str
    language: str
    original_image_b64: str
    heatmap_image_b64: str
    hospitals: List[dict]

# API Endpoints
@app.get("/api/health")
def read_root():
    return {"status": "healthy", "service": "AI Skin Disease Detection Multi-Modal System"}

@app.get("/api/metrics")
def get_model_metrics():
    """Returns the evaluation metrics from model training."""
    metrics_path = os.path.join(CHECKPOINT_DIR, "metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Model metrics not found. Ensure training completed.")

@app.post("/api/predict")
async def predict_skin_disease(
    image: UploadFile = File(...),
    symptoms: str = Form(...),
    language: str = Form("en"),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None),
    city: Optional[str] = Form(None)
):
    """
    Main prediction endpoint. Accepts skin image and symptom text (with optional GPS/city coordinates).
    Uses Multi-Modal Fusion network to predict disease and severity.
    Includes Grad-CAM explanation and local hospital recommendations.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")
        
    try:
        # 1. Save uploaded image temporarily
        file_id = str(uuid.uuid4())
        orig_img_path = os.path.join(TEMP_DIR, f"{file_id}_orig.jpg")
        with open(orig_img_path, "wb") as f:
            shutil.copyfileobj(image.file, f)
            
        # 2. Process image tensor
        pil_img = Image.open(orig_img_path).convert("RGB")
        img_transform = get_image_transforms(train=False)
        img_tensor = img_transform(pil_img).unsqueeze(0).to(device)
        
        # 3. Translate symptoms if necessary (Kannada / Hindi -> English)
        translated_text = translate_symptoms(symptoms, language)
        
        # 4. Extract Text Embeddings
        text_emb = text_encoder.get_embeddings(translated_text)
        text_tensor = torch.tensor(text_emb, dtype=torch.float32).unsqueeze(0).to(device)
        
        # 5. Extract Image Features
        with torch.no_grad():
            img_features = cnn_model.extract_features(img_tensor)
            
        # 6. Multi-Modal Fusion Forward Pass
        # We need gradients active for Grad-CAM on the image model, but we run fusion inside no_grad
        with torch.no_grad():
            disease_logits, severity_logits = fusion_model(img_features, text_tensor)
            
            # Softmax to get probabilities
            disease_probs = torch.softmax(disease_logits, dim=1)[0]
            severity_probs = torch.softmax(severity_logits, dim=1)[0]
            
            pred_disease_idx = torch.argmax(disease_probs).item()
            pred_severity_idx = torch.argmax(severity_probs).item()
            
            confidence = float(disease_probs[pred_disease_idx].item())
            predicted_disease = DISEASE_CLASSES[pred_disease_idx]
            predicted_severity = SEVERITY_LEVELS[pred_severity_idx]
            
        # 7. Generate Grad-CAM Heatmap Overlay
        # Run Grad-CAM on the target layer features[-1] of the base EfficientNet model
        # Target layer is features[-1] (the final convolutional layer before pooling)
        target_layer = cnn_model.features[-1]
        grad_cam = GradCAM(cnn_model, target_layer)
        
        # Generate heat map
        heatmap = grad_cam.generate_heatmap(img_tensor, target_class=pred_disease_idx)
        grad_cam.remove_hooks()
        
        # Overlay heatmap on original image
        overlay_pil_orig, heatmap_pil, overlay_pil = overlay_heatmap(pil_img, heatmap)
        
        # Save output images
        heatmap_path = os.path.join(TEMP_DIR, f"{file_id}_heatmap.jpg")
        overlay_path = os.path.join(TEMP_DIR, f"{file_id}_overlay.jpg")
        
        heatmap_pil.save(heatmap_path)
        overlay_pil.save(overlay_path)
        
        # Convert images to base64 for direct UI embedding
        original_b64 = pil_to_base64(overlay_pil_orig)
        heatmap_b64 = pil_to_base64(heatmap_pil)
        overlay_b64 = pil_to_base64(overlay_pil)
        
        # 8. Clinical Explanations & Confidence-Aware Recommendations
        explanation = get_clinical_explanation(predicted_disease)
        recommendations = get_confidence_aware_recommendations(predicted_disease, confidence, predicted_severity)
        
        # 9. Geocode City if GPS coordinates are missing but city is typed
        current_lat, current_lon = lat, lon
        if (current_lat is None or current_lon is None) and city:
            coords = get_coordinates_from_city(city)
            if coords:
                current_lat, current_lon = coords
                
        # Default fallback to Bengaluru if location detection failed completely
        if current_lat is None or current_lon is None:
            current_lat, current_lon = 12.9716, 77.5946 # Bengaluru Central
            city = city or "Bengaluru"
            
        # 10. Fetch Nearby Dermatologists
        hospitals = find_nearby_dermatologists(current_lat, current_lon, city)
        
        # Clean up original image and saved temp files to save storage
        # PDF export will use the base64 versions sent from frontend
        try:
            os.remove(orig_img_path)
            os.remove(heatmap_path)
            os.remove(overlay_path)
        except Exception as e:
            print(f"Error clean temp files: {e}")
            
        return JSONResponse(content={
            "disease": predicted_disease,
            "confidence": confidence,
            "severity": predicted_severity,
            "translated_symptoms": translated_text,
            "original_image": f"data:image/jpeg;base64,{original_b64}",
            "heatmap_image": f"data:image/jpeg;base64,{heatmap_b64}",
            "overlay_image": f"data:image/jpeg;base64,{overlay_b64}",
            "explanation": explanation,
            "recommendations": recommendations,
            "hospitals": hospitals,
            "location": {"lat": current_lat, "lon": current_lon, "city": city}
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Diagnostic pipeline error: {str(e)}")

@app.post("/api/export-pdf")
def export_pdf_report(request: PDFRequest):
    """
    Accepts current diagnosis output and base64 images, generates a downloadable PDF report,
    and streams it back to the client.
    """
    try:
        file_id = str(uuid.uuid4())
        pdf_path = os.path.join(TEMP_DIR, f"report_{file_id}.pdf")
        
        # Decode base64 images to temporary physical files for ReportLab inclusion
        orig_img_data = base64.b64decode(request.original_image_b64.split(",")[-1])
        heat_img_data = base64.b64decode(request.heatmap_image_b64.split(",")[-1])
        
        temp_orig = os.path.join(TEMP_DIR, f"{file_id}_temp_orig.jpg")
        temp_heat = os.path.join(TEMP_DIR, f"{file_id}_temp_heat.jpg")
        
        with open(temp_orig, "wb") as f:
            f.write(orig_img_data)
        with open(temp_heat, "wb") as f:
            f.write(heat_img_data)
            
        # Get recommendations
        recommendations = get_confidence_aware_recommendations(request.disease, request.confidence, request.severity)
        
        # Call report lab service
        generate_pdf_report(
            pdf_path,
            temp_orig,
            temp_heat,
            request.disease,
            request.confidence,
            request.severity,
            request.symptoms,
            request.language,
            request.hospitals,
            recommendations
        )
        
        # Clean up temporary images
        try:
            os.remove(temp_orig)
            os.remove(temp_heat)
        except Exception as e:
            print(f"Error cleaning temp images: {e}")
            
        return FileResponse(
            pdf_path, 
            media_type="application/pdf", 
            filename=f"Skin_Disease_Report_{datetime_str()}.pdf"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

# Clinical Helper Databases
def datetime_str():
    from datetime import datetime
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def get_clinical_explanation(disease: str) -> str:
    explanations = {
        "Melanoma": (
            "Melanoma is a serious form of skin cancer that begins in cells known as melanocytes. "
            "It is characterized by irregular borders, asymmetry, and color variation within a single lesion. "
            "Early detection is crucial as it has a high propensity to metastasize to other organs."
        ),
        "Melanocytic Nevus": (
            "A melanocytic nevus (commonly known as a mole) is a benign proliferation of melanocytes. "
            "These lesions are typically symmetrical, round or oval-shaped, with regular borders and a uniform color. "
            "They are extremely common and benign, requiring no medical intervention unless changes are observed."
        ),
        "Atopic Dermatitis (Eczema)": (
            "Atopic dermatitis is a chronic, pruritic (itchy) inflammatory skin disease. "
            "It commonly manifests as red, dry, flaky patches, especially in flexural creases (elbows/knees). "
            "It is associated with an overactive immune response and skin barrier dysfunction."
        ),
        "Seborrheic Keratosis": (
            "Seborrheic keratosis is a very common, benign skin tumor that appears as a 'stuck-on' waxy or scaly plaque. "
            "They range in color from tan to dark brown and typically have a granular surface. "
            "They are completely non-cancerous and usually removed only for aesthetic reasons or if irritated."
        ),
        "Acne Vulgaris": (
            "Acne vulgaris is a common inflammatory dermatosis of the pilosebaceous units. "
            "It is caused by sebum overproduction, follicular hyperkeratinization, and bacterial colonization by C. acnes. "
            "It presents as comedones (blackheads/whiteheads), papules, and pustules on sebum-rich areas like the face."
        )
    }
    return explanations.get(disease, "A skin lesion displaying clinical features typical of the predicted class.")

def get_confidence_aware_recommendations(disease: str, confidence: float, severity: str) -> list:
    """Returns clinical guidelines customized based on classification confidence and severity."""
    # Base Precautions
    base_precautions = {
        "Melanoma": [
            "Schedule an urgent face-to-face biopsy and clinical exam with a board-certified dermatologist.",
            "Avoid scratching, scrubbing, or picking at the lesion to prevent bleeding or secondary infection.",
            "Perform monthly self-skin examinations using the ABCDE guidelines.",
            "Use broad-spectrum SPF 50+ sunscreen daily and protect the area from direct solar radiation."
        ],
        "Melanocytic Nevus": [
            "No immediate treatment is required as this is a benign mole.",
            "Monitor the mole monthly for changes in asymmetry, borders, color, diameter, or evolution (ABCDEs).",
            "Take baseline photographs with a reference object (like a coin) to track size changes over time.",
            "Seek evaluation if the mole starts itching, bleeding, or growing rapidly."
        ],
        "Atopic Dermatitis (Eczema)": [
            "Apply a thick, fragrance-free emollient or moisturizer within 3 minutes after bathing.",
            "Use mild, soap-free skin cleansers and avoid hot showers which dry out the skin barrier.",
            "Identify and avoid triggers (e.g. harsh soaps, wool clothing, stress, allergens).",
            "Consult a physician regarding short-term topical corticosteroid or immunomodulator therapy."
        ],
        "Seborrheic Keratosis": [
            "This is a benign growth. Medical removal is optional and only needed if it gets irritated by clothing.",
            "Avoid trying to pick, scratch, or peel the lesion off, as this can lead to scarring or infection.",
            "Apply basic moisturizers if the lesion feels dry or itchy.",
            "Get evaluated if the lesion grows rapidly, bleeds, or changes color."
        ],
        "Acne Vulgaris": [
            "Wash your face twice daily with a gentle, non-comedogenic cleanser.",
            "Incorporate over-the-counter active agents such as Salicylic Acid or Benzoyl Peroxide.",
            "Avoid picking or squeezing pimples, as this worsens inflammation and leads to permanent scarring.",
            "Consult a doctor for prescription-strength retinoids or topical antibiotics if condition persists."
        ]
    }
    
    precautions = base_precautions.get(disease, ["Consult a medical professional for advice."]).copy()
    
    # Confidence Adjustments
    if confidence < 0.40:
        return [
            "WARNING: The AI system has LOW CONFIDENCE in this prediction.",
            "The diagnostic findings are highly uncertain. Do not rely on this prediction as a confirmed diagnosis.",
            "Please schedule an in-person consultation with a dermatologist for a professional evaluation.",
            "Avoid starting any self-treatments or topical medications without a professional prescription."
        ]
    elif confidence < 0.75:
        monitoring_tips = [
            "NOTE: The AI prediction is moderately confident. We recommend careful monitoring.",
            "Track this lesion closely over the next 2-4 weeks. Take weekly photographs under identical lighting.",
            "If you notice any rapid growth, color changes, or bleeding, consult a dermatologist immediately."
        ]
        return monitoring_tips + precautions
    else:
        # High confidence
        return ["CONFIRMED PREDICTION: The AI system is highly confident in this analysis."] + precautions

# Mount static files of the React frontend compiled build if the directory exists
frontend_dist_path = os.path.abspath("frontend/dist")
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")
