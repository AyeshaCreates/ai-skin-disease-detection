import os
import io
import requests
import urllib3
from PIL import Image, ImageDraw

# Disable SSL warnings for clean test output
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_live_vercel_deployment():
    base_url = "https://ai-skin-disease-detection-one.vercel.app"
    
    # 1. Verify Health check
    print("Testing /api/health...")
    health_url = f"{base_url}/api/health"
    resp = requests.get(health_url, verify=False)
    print(f"Health Status Code: {resp.status_code}")
    print(f"Health Response: {resp.text}")
    assert resp.status_code == 200
    
    # Create a valid clinical lesion image (skin tone background with a dark brown lesion)
    img = Image.new('RGB', (224, 224), color=(245, 220, 205))
    draw = ImageDraw.Draw(img)
    draw.ellipse([70, 70, 154, 154], fill=(120, 70, 45))
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()
    
    # 2. Test Prediction Endpoint
    print("\nTesting /api/predict (End-to-End Multimodal Inference)...")
    predict_url = f"{base_url}/api/predict"
    predict_resp = requests.post(
        predict_url,
        files={"image": ("test.jpg", img_byte_arr, "image/jpeg")},
        data={
            "symptoms": "asymmetric dark brown mole that is growing and itchy",
            "language": "en",
            "city": "Bengaluru"
        },
        verify=False
    )
    print(f"Predict Status Code: {predict_resp.status_code}")
    assert predict_resp.status_code == 200
    res = predict_resp.json()
    print("Prediction Successful!")
    print(f"Primary Disease: {res.get('disease')}")
    print(f"Confidence: {res.get('confidence')}")
    print(f"Severity: {res.get('severity')}")
    print(f"Hospitals: {len(res.get('hospitals', []))} found")
    
    # Verify response keys
    assert "disease" in res
    assert "confidence" in res
    assert "severity" in res
    assert "heatmap_image" in res
    assert "overlay_image" in res
    assert "explanation" in res
    assert "recommendations" in res
    assert "top_predictions" in res
    print("All response attributes successfully verified!")
    
    # 3. Test PDF report download endpoint
    print("\nTesting /api/export-pdf (Dynamic Report Compiler)...")
    pdf_url = f"{base_url}/api/export-pdf"
    pdf_payload = {
        "disease": res["disease"],
        "confidence": res["confidence"],
        "severity": res["severity"],
        "symptoms": res["translated_symptoms"],
        "language": "en",
        "original_image_b64": res["original_image"],
        "heatmap_image_b64": res["heatmap_image"],
        "hospitals": res["hospitals"]
    }
    pdf_resp = requests.post(pdf_url, json=pdf_payload, verify=False)
    print(f"PDF Response Status: {pdf_resp.status_code}")
    assert pdf_resp.status_code == 200
    assert len(pdf_resp.content) > 1000  # Non-empty PDF
    print(f"PDF Download Verified (Report size: {len(pdf_resp.content)} bytes)")
    
    # 4. Test Invalid-image rejection
    print("\nTesting Out-of-Distribution Rejection (Invalid Image)...")
    bad_img = Image.new('RGB', (224, 224), color=(0, 0, 0)) # Pure black image
    bad_img_byte_arr = io.BytesIO()
    bad_img.save(bad_img_byte_arr, format='JPEG')
    bad_img_byte_arr = bad_img_byte_arr.getvalue()
    
    bad_resp = requests.post(
        predict_url,
        files={"image": ("test.jpg", bad_img_byte_arr, "image/jpeg")},
        data={"symptoms": "rash on skin", "language": "en"},
        verify=False
    )
    print(f"Invalid Image Status Code: {bad_resp.status_code}")
    print(f"Invalid Image Response: {bad_resp.text}")
    assert bad_resp.status_code == 400
    print("OOD Image rejection successfully verified!")
    
    print("\n=======================================================")
    print("   ALL CLOUD VERIFICATION INTEGRATION TESTS PASSED!    ")
    print("=======================================================")

if __name__ == "__main__":
    test_live_vercel_deployment()
