import os
import torch
import numpy as np
import pytest
from fastapi.testclient import TestClient

# Import modules from our project structure
# We add backend to python path dynamically in test if needed, or assume it's run from root
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.models.image_model import SkinDiseaseCNN, get_image_transforms
from backend.app.models.text_model import SymptomTextEncoder
from backend.app.models.fusion_model import MultiModalFusionNet
from backend.app.services.location import calculate_distance, get_coordinates_from_city, find_nearby_dermatologists
from backend.app.services.pdf_report import generate_pdf_report
from backend.app.main import app

def test_image_model_output_shape():
    """Verify that EfficientNet image model extracts correct dimensions."""
    model = SkinDiseaseCNN(num_classes=7, pretrained=False)
    # Synthetic batch of size 2, 3 channels, 224x224
    dummy_input = torch.randn(2, 3, 224, 224)
    
    # Feature extraction check (EfficientNet feature dimension is 1280)
    features = model.extract_features(dummy_input)
    assert features.shape == (2, 1280)
    
    # Standalone classification check
    logits = model(dummy_input)
    assert logits.shape == (2, 7)

def test_text_encoder_output_shape():
    """Verify that SymptomTextEncoder extracts 384-dimensional dense vectors."""
    encoder = SymptomTextEncoder()
    # Test symptom phrase
    text = "Very itchy, red patches on my arm."
    embedding = encoder.get_embeddings(text)
    
    assert isinstance(embedding, np.ndarray)
    assert embedding.shape == (384,)
    
    # Check that it handles empty strings gracefully
    empty_emb = encoder.get_embeddings("")
    assert empty_emb.shape == (384,)
    assert np.all(empty_emb == 0)

def test_fusion_model_output_shape():
    """Verify that the fusion layer fuses and outputs predictions correctly."""
    model = MultiModalFusionNet(num_classes=7)
    
    # Synthetic image features (1280-dim) and text features (384-dim)
    dummy_img_features = torch.randn(4, 1280)
    dummy_text_features = torch.randn(4, 384)
    
    d_logits, s_logits = model(dummy_img_features, dummy_text_features)
    
    # 4 samples, 7 classes for disease, 3 classes for severity
    assert d_logits.shape == (4, 7)
    assert s_logits.shape == (4, 3)

def test_distance_calculator():
    """Verify coordinate distance computation accuracy (Haversine)."""
    # Distance between Bengaluru (12.9716, 77.5946) and Mysore (12.2958, 76.6394) is approx 128 km
    dist = calculate_distance(12.9716, 77.5946, 12.2958, 76.6394)
    assert 120 < dist < 140

def test_pdf_generation():
    """Verify that the PDF report compiles and creates a physical document."""
    pdf_path = "tests/test_report.pdf"
    os.makedirs("tests", exist_ok=True)
    
    # Create temporary dummy images
    from PIL import Image
    temp_img_path = "tests/test_skin.jpg"
    Image.new("RGB", (100, 100), color="red").save(temp_img_path)
    
    hospitals = [
        {"name": "Dermatology Test Clinic", "distance": "1.2 km", "phone": "+91 99999 99999"}
    ]
    recommendations = [
        "Test precaution 1",
        "Test precaution 2"
    ]
    
    generate_pdf_report(
        pdf_path,
        temp_img_path,
        temp_img_path,
        "Melanoma",
        0.85,
        "Severe",
        "Itchy dark spot",
        "en",
        hospitals,
        recommendations
    )
    
    # Assert PDF file was physically generated and has content
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 0
    
    # Cleanup
    os.remove(pdf_path)
    os.remove(temp_img_path)

def test_api_health_endpoint():
    """Verify backend FastAPI server health check."""
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_image_validation_cases():
    """Verify image validation detects unrelated, healthy, blurry, and valid images."""
    from backend.app.models.image_model import validate_skin_image
    from PIL import Image, ImageDraw
    import cv2
    
    # 1. Unrelated (non-skin blue color)
    img_unrelated = Image.new('RGB', (224, 224), color=(0, 0, 255))
    res_unrelated = validate_skin_image(img_unrelated)
    assert res_unrelated["valid"] is False
    assert "Invalid Image" in res_unrelated["message"]
    
    # 2. Healthy skin (skin tone with zero abnormalities)
    img_healthy = Image.new('RGB', (224, 224), color=(245, 220, 205))
    np_healthy = np.array(img_healthy)
    noise = np.random.normal(0, 2.5, np_healthy.shape).astype(np.int16)
    np_healthy = np.clip(np_healthy + noise, 0, 255).astype(np.uint8)
    img_healthy = Image.fromarray(np_healthy)
    res_healthy = validate_skin_image(img_healthy)
    assert res_healthy["valid"] is False
    assert "No Skin Abnormality" in res_healthy["message"]
    
    # 3. Blurry image
    img_blurry = Image.new('RGB', (224, 224), color=(245, 220, 205))
    np_blur = np.array(img_blurry)
    cv2.GaussianBlur(np_blur, (51, 51), 0, dst=np_blur)
    img_blurry = Image.fromarray(np_blur)
    res_blurry = validate_skin_image(img_blurry)
    assert res_blurry["valid"] is False
    assert "Image Quality Too Low" in res_blurry["message"]
    
    # 4. Valid lesion
    img_lesion = Image.new('RGB', (224, 224), color=(245, 220, 205))
    draw = ImageDraw.Draw(img_lesion)
    draw.ellipse([70, 70, 154, 154], fill=(120, 70, 45))
    res_lesion = validate_skin_image(img_lesion)
    assert res_lesion["valid"] is True
