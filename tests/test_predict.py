import requests
from PIL import Image
import os

def main():
    print("Generating dummy test skin image...")
    img = Image.new('RGB', (224, 224), color = (200, 100, 100))
    img.save('test_skin.jpg')
    
    print("Testing /api/predict endpoint locally on port 8000...")
    url = "http://127.0.0.1:8000/api/predict"
    
    files = {'image': ('test_skin.jpg', open('test_skin.jpg', 'rb'), 'image/jpeg')}
    data = {
        'symptoms': 'red dry flaky itchy patches on elbow creases',
        'language': 'en',
        'city': 'Bengaluru'
    }
    
    try:
        r = requests.post(url, files=files, data=data, timeout=20)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            print("Success! Response JSON:")
            res = r.json()
            # print keys and types
            for k, v in res.items():
                if isinstance(v, str) and len(v) > 100:
                    print(f"  {k}: Base64 string (length {len(v)})")
                else:
                    print(f"  {k}: {v}")
        else:
            print(f"Error! Response text: {r.text}")
    except Exception as e:
        print(f"Connection failed: {e}")
        
    # Clean up test image
    if os.path.exists('test_skin.jpg'):
        os.remove('test_skin.jpg')

if __name__ == "__main__":
    main()
