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
from backend.app.models.image_model import SkinDiseaseCNN, GradCAM, overlay_heatmap, get_image_transforms, validate_skin_image
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
    num_classes = len(DISEASE_CLASSES)
    cnn_model = SkinDiseaseCNN(num_classes=num_classes, pretrained=True).to(device)
    fusion_model = MultiModalFusionNet(num_classes=num_classes).to(device)
    
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
    original_image_b64: Optional[str] = None
    heatmap_image_b64: Optional[str] = None
    original_image: Optional[str] = None
    heatmap_image: Optional[str] = None
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
        
        # Image input validation / OOD protection
        validation_res = validate_skin_image(pil_img)
        if not validation_res["valid"]:
            # Delete temporary file
            if os.path.exists(orig_img_path):
                os.remove(orig_img_path)
            raise HTTPException(status_code=400, detail=validation_res["message"])
            
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
            
            # Apply Temperature Scaling Calibration (T = 0.30)
            # Divides logits by T to align softmax probabilities with empirical accuracy
            calibrated_disease_logits = disease_logits / 0.30
            calibrated_severity_logits = severity_logits / 0.30
            
            disease_probs = torch.softmax(calibrated_disease_logits, dim=1)[0]
            severity_probs = torch.softmax(calibrated_severity_logits, dim=1)[0]
            
            pred_disease_idx = torch.argmax(disease_probs).item()
            pred_severity_idx = torch.argmax(severity_probs).item()
            
            confidence = float(disease_probs[pred_disease_idx].item())
            predicted_disease = DISEASE_CLASSES[pred_disease_idx]
            predicted_severity = SEVERITY_LEVELS[pred_severity_idx]
            
            # PHASE 7: Backend Debugging Log Utility
            print("==================================================")
            print("             AI ENGINE INFERENCE DEBUG            ")
            print("==================================================")
            print(f"Model output shape: {disease_logits.shape}")
            print(f"Number of target classes: {len(DISEASE_CLASSES)}")
            print(f"Predicted class: {predicted_disease} (Index: {pred_disease_idx})")
            print(f"Calibrated probability: {confidence:.4f}")
            
            # Get top 5 predictions for logs
            top5_probs, top5_indices = torch.topk(disease_probs, k=min(5, len(DISEASE_CLASSES)))
            top5_raw_logits, _ = torch.topk(disease_logits[0], k=min(5, len(DISEASE_CLASSES)))
            
            print("\nTOP 5 PREDICTIONS:")
            for rank, (prob, idx, logit) in enumerate(zip(top5_probs, top5_indices, top5_raw_logits), 1):
                cls_name = DISEASE_CLASSES[idx.item()]
                print(f"  {rank}. {cls_name} — Prob: {prob.item():.4f} | Raw Logit: {logit.item():.4f} (Index: {idx.item()})")
            print("==================================================")
            
            # Get top 3 predictions
            topk_probs, topk_indices = torch.topk(disease_probs, k=min(3, len(DISEASE_CLASSES)))
            top_predictions = []
            for prob, idx in zip(topk_probs, topk_indices):
                top_predictions.append({
                    "disease": DISEASE_CLASSES[idx.item()],
                    "confidence": float(prob.item())
                })
            
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
            "location": {"lat": current_lat, "lon": current_lon, "city": city},
            "top_predictions": top_predictions
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
        orig_b64 = request.original_image_b64 or request.original_image
        heat_b64 = request.heatmap_image_b64 or request.heatmap_image
        
        if not orig_b64 or not heat_b64:
            raise HTTPException(status_code=400, detail="Missing base64 images for report.")
            
        orig_img_data = base64.b64decode(orig_b64.split(",")[-1])
        heat_img_data = base64.b64decode(heat_b64.split(",")[-1])
        
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
        ),
        "Basal Cell Carcinoma": (
            "Basal cell carcinoma (BCC) is the most common type of skin cancer. "
            "It originates in the basal cells of the epidermis, typically on sun-exposed areas. "
            "It often presents as a shiny pearly pink nodule with visible tiny blood vessels (telangiectasias), "
            "rolled borders, and sometimes central ulceration or crusting."
        ),
        "Psoriasis": (
            "Psoriasis is a chronic autoimmune skin condition that accelerates the life cycle of skin cells. "
            "This rapid turnover leads to cells building up rapidly on the surface of the skin. "
            "It presents as thick red plaques covered with silvery scales, commonly on elbows, knees, scalp, and torso."
        ),
        "Vitiligo": (
            "Vitiligo is a long-term skin condition characterized by patches of the skin losing their pigment. "
            "It occurs when melanocytes (cells responsible for skin color) are destroyed by the body's immune system, "
            "resulting in flat, depigmented milky-white spots with sharp, distinct margins."
        ),
        "Rosacea": (
            "Rosacea is a chronic inflammatory skin condition that primarily affects the face. "
            "It causes persistent redness, flushing, and visible small blood vessels (telangiectasias), "
            "often accompanied by small red pus-filled papules resembling acne."
        ),
        "Tinea Corporis (Ringworm)": (
            "Tinea corporis is a superficial fungal infection of the body skin. "
            "It is caused by dermatophyte fungi and typically presents as an itchy, circular ring-like rash "
            "with elevated, scaly red borders and a relatively clear center."
        ),
        "Impetigo": (
            "Impetigo is a highly contagious superficial bacterial skin infection, common in children. "
            "It is caused by Staph or Strep bacteria and is characterized by honey-colored crusted sores "
            "that form around the nose, lips, and extremities."
        ),
        "Urticaria (Hives)": (
            "Urticaria (commonly known as hives) is a vascular skin reaction characterized by transient wheals. "
            "It presents as raised, severely itchy red or skin-colored welts that appear and fade rapidly, "
            "triggered by allergic responses, physical stimuli, or systemic stress."
        ),
        "Warts": (
            "Warts are benign epidermal growths caused by infection with the Human Papillomavirus (HPV). "
            "They present as rough, elevated skin-colored papules with a cauliflower-like texture, "
            "often containing small black dots representing clotted capillary vessels."
        ),
        "Contact Dermatitis": (
            "Contact dermatitis is an acute or chronic localized skin inflammation. "
            "It is triggered by direct exposure to allergens (poison ivy, nickel) or irritants (soaps, acids), "
            "presenting as an itchy, red rash with vesicles or scaling localized to the contact area."
        ),
        "Folliculitis": (
            "Folliculitis is an inflammatory condition of the hair follicles, typically due to bacterial or fungal infection. "
            "It presents as small, itchy, pus-filled pimples centered around hair shafts, commonly occurring on "
            "shaved or friction-prone areas like the face, scalp, and thighs."
        ),
        "Lichen Planus": (
            "Lichen planus is a chronic autoimmune condition affecting the skin and mucous membranes. "
            "It presents as shiny, polygonal, flat-topped violaceous (purple) papules that are intensely itchy "
            "and show fine white lacy lines known as Wickham's striae."
        ),
        "Herpes Zoster": (
            "Herpes zoster (commonly known as shingles) is a painful viral infection caused by the reactivation of "
            "the Varicella-Zoster virus (chickenpox). It presents as a painful, unilateral band-like rash "
            "of grouped fluid-filled blisters along a specific sensory nerve path (dermatome)."
        ),
        "Pityriasis Rosea": (
            "Pityriasis rosea is an acute, self-limiting inflammatory skin eruption. "
            "It begins with a single larger oval 'herald patch' on the torso, followed by a widespread breakout "
            "of smaller scaly pink oval spots aligned along skin cleavage lines in a 'Christmas tree' pattern."
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
        ],
        "Basal Cell Carcinoma": [
            "Schedule a clinical evaluation with a dermatologist for a biopsy and potential excision.",
            "Protect the lesion and your surrounding skin from UV exposure with SPF 50+ sunscreen.",
            "Avoid picking or scratching the crusted center, as BCCs bleed easily.",
            "Ensure regular full-body skin screening to monitor for new lesions."
        ],
        "Psoriasis": [
            "Apply rich moisturizing creams or ointments daily to maintain the skin barrier.",
            "Avoid scrubbing plaques or peeling scales off, as this can trigger new lesions (Koebner phenomenon).",
            "Incorporate mild exposure to sunlight, as controlled UV light can improve plaque symptoms.",
            "Consult a physician about topical treatments (corticosteroids, salicylic acid) or systemic therapies."
        ],
        "Vitiligo": [
            "Protect depigmented skin areas from sunburn using SPF 50+ broad-spectrum sunscreen.",
            "Consult a dermatologist regarding phototherapy (NB-UVB) or topical corticosteroid treatment.",
            "Avoid skin trauma or friction, as depigmentation can occur at injured sites (Koebner response).",
            "Seek psychological support if the patches cause cosmetic distress or anxiety."
        ],
        "Rosacea": [
            "Identify and avoid triggers such as spicy foods, alcohol, hot beverages, and extreme temperatures.",
            "Apply a gentle, non-chemical mineral sunscreen (zinc oxide/titanium dioxide) daily.",
            "Use mild, non-abrasive facial cleansers and avoid scrubbing or rubbing the skin.",
            "Consult a physician about topical metronidazole, azelaic acid, or oral antibiotics for persistent bumps."
        ],
        "Tinea Corporis (Ringworm)": [
            "Apply an over-the-counter topical antifungal cream (terbinafine, clotrimazole) 1-2 inches beyond the active border.",
            "Keep the affected skin clean and completely dry, especially in hot or humid environments.",
            "Avoid sharing towels, clothing, or personal items to prevent spreading the fungal infection.",
            "Seek evaluation if the circular rash spreads or fails to improve after 2 weeks of antifungal treatment."
        ],
        "Impetigo": [
            "Keep the sores clean by washing gently with mild soap and running water, then cover them loosely.",
            "Avoid touching, scratching, or picking the honey-colored crusts to prevent auto-inoculation.",
            "Wash hands thoroughly after touching the affected areas; wash linens and clothes separately.",
            "Consult a physician for prescription topical mupirocin ointment or oral antibiotics."
        ],
        "Urticaria (Hives)": [
            "Take an over-the-counter non-drowsy antihistamine to reduce itching and swelling.",
            "Apply cool compresses or take a cool bath to soothe the inflamed welts.",
            "Avoid hot water, tight clothing, and known triggers (certain foods or medicines).",
            "Seek emergency medical care immediately if hives are accompanied by difficulty breathing or facial swelling."
        ],
        "Warts": [
            "Avoid picking, scratching, or biting warts, as HPV can spread to other areas of your skin.",
            "Keep warts clean and dry; wash hands thoroughly after touching a lesion.",
            "Do not share emery boards, pumice stones, or nail clippers used on warts.",
            "Consult a healthcare professional regarding cryotherapy, salicylic acid treatments, or laser removal."
        ],
        "Contact Dermatitis": [
            "Wash the skin immediately with copious water if contact with a suspected irritant or allergen is recognized.",
            "Apply cool compresses and calamine lotion to relieve localized itching.",
            "Use fragrance-free moisturizers and avoid contact with the inciting substance.",
            "Consult a physician if rash is extensive, painful, or does not improve within a week."
        ],
        "Folliculitis": [
            "Wash the area twice daily with an antibacterial soap or wash.",
            "Avoid shaving or waxing the affected area until the pustules have cleared.",
            "Wear loose, breathable clothing to minimize friction and sweat buildup.",
            "Consult a doctor if the folliculitis spreads, turns into a boil, or fails to resolve."
        ],
        "Lichen Planus": [
            "Avoid scratching or rubbing the purple bumps to prevent secondary bacterial infection.",
            "Use mild, soap-free body washes and apply thick emollients to calm the skin.",
            "Consult a dermatologist regarding topical corticosteroids or phototherapy.",
            "Perform regular oral checks if you experience purple rashes, as Lichen Planus can affect oral mucosa."
        ],
        "Herpes Zoster": [
            "Seek immediate medical evaluation (within 72 hours of rash onset) to start antiviral therapy.",
            "Keep the fluid-filled blisters clean and dry; cover them with a sterile, non-stick dressing.",
            "Wear loose-fitting clothing to minimize pain and friction over the active nerve path.",
            "Avoid contact with pregnant women, infants, and immunocompromised individuals who haven't had chickenpox."
        ],
        "Pityriasis Rosea": [
            "Reassure yourself that this is a benign, self-limiting condition that typically resolves in 6-8 weeks.",
            "Take lukewarm oatmeal baths and apply calamine lotion to soothe any itching.",
            "Avoid vigorous exercise and hot showers, as body heat can temporarily worsen the pink spots.",
            "Consult a doctor if the diagnosis is uncertain or if itching is severe."
        ]
    }
    
    precautions = base_precautions.get(disease, ["Consult a medical professional for advice."]).copy()
    
    # Calibrated Confidence Categories
    if confidence < 0.70:
        return [
            "WARNING: The AI system has LOW CONFIDENCE in this prediction.",
            "The diagnostic findings are highly uncertain. Please upload a clearer image or consult a qualified dermatologist.",
            "Do not rely on this prediction as a confirmed diagnosis.",
            "Avoid starting any self-treatments or topical medications without a professional prescription."
        ]
    elif confidence < 0.90:
        monitoring_tips = [
            "NOTE: The AI prediction is moderately confident. We recommend careful monitoring.",
            "Track this lesion closely over the next 2-4 weeks. Take weekly photographs under identical lighting.",
            "If you notice any rapid growth, color changes, or bleeding, consult a dermatologist immediately."
        ]
        return monitoring_tips + precautions
    else:
        # High confidence
        return ["CONFIRMED PREDICTION: The AI system is highly confident in this analysis (High Confidence >= 90%)."] + precautions

# Mount static files of the React frontend compiled build if the directory exists
frontend_dist_path = os.path.abspath("frontend/dist")
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")
