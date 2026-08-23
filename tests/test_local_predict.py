import os
import io
import torch
import numpy as np
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
import sys

# Ensure backend package is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.main import app

def test_local_prediction():
    # Use context manager so startup event handler runs and models load
    with TestClient(app) as client:
        # Create a valid clinical lesion image (skin tone background with a dark brown lesion)
        img = Image.new('RGB', (224, 224), color=(245, 220, 205))
        draw = ImageDraw.Draw(img)
        draw.ellipse([70, 70, 154, 154], fill=(120, 70, 45))
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        img_byte_arr = img_byte_arr.getvalue()
        
        print("Sending POST request to local /api/predict...")
        response = client.post(
            "/api/predict",
            files={"image": ("test.jpg", img_byte_arr, "image/jpeg")},
            data={
                "symptoms": "asymmetric dark brown mole that is growing and itchy",
                "language": "en",
                "city": "Bengaluru"
            }
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            res = response.json()
            print("Prediction Successful!")
            print(f"Primary Disease: {res.get('disease')}")
            print(f"Confidence: {res.get('confidence')}")
            print(f"Severity: {res.get('severity')}")
            print(f"Hospitals found: {len(res.get('hospitals', []))}")
            print(f"Top predictions: {res.get('top_predictions')}")
            
            # Verify keys
            assert "disease" in res
            assert "confidence" in res
            assert "severity" in res
            assert "heatmap_image" in res
            assert "overlay_image" in res
            assert "explanation" in res
            assert "recommendations" in res
            assert "top_predictions" in res
            print("All response attributes successfully verified!")
        else:
            print(f"Failed: {response.text}")
            raise AssertionError(f"Request failed with status code {response.status_code}")
        
if __name__ == "__main__":
    test_local_prediction()
