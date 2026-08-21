import requests
from PIL import Image
import os

def main():
    import shutil
    from PIL import ImageDraw
    img_path = 'data/skin_images/Atopic_Dermatitis_Eczema/synth_0.jpg'
    if os.path.exists(img_path):
        print("Loading realistic Eczema skin image from dataset...")
        shutil.copy(img_path, 'test_skin.jpg')
    else:
        print("Generating realistic synthetic Eczema skin image...")
        img = Image.new('RGB', (224, 224), color=(245, 220, 205))
        draw = ImageDraw.Draw(img)
        draw.ellipse([60, 60, 190, 190], fill=(235, 130, 120))
        img.save('test_skin.jpg')
    
    print("Testing /api/predict endpoint on the public URL...")
    url = "https://small-eyes-know.loca.lt/api/predict"
    
    try:
        with open('test_skin.jpg', 'rb') as f:
            files = {'image': ('test_skin.jpg', f, 'image/jpeg')}
            data = {
                'symptoms': 'red dry flaky itchy patches on elbow creases',
                'language': 'en',
                'city': 'Bengaluru'
            }
            r = requests.post(url, files=files, data=data, headers={'Bypass-Tunnel-Reminder': 'true'}, verify=False, timeout=30)
            
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
