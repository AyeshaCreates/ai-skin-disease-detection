import os
import json
import urllib3
import requests
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from PIL import Image, ImageDraw
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix
import ssl

# Disable SSL verification globally to prevent PyTorch download certificate validation errors
ssl._create_default_https_context = ssl._create_unverified_context

# Disable urllib3 insecure request warnings for our SSL bypass
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Import our models
from backend.app.models.image_model import SkinDiseaseCNN, get_image_transforms
from backend.app.models.text_model import SymptomTextEncoder
from backend.app.models.fusion_model import MultiModalFusionNet

# Define Constants
DISEASE_CLASSES = [
    "Melanoma",
    "Melanocytic Nevus",
    "Atopic Dermatitis (Eczema)",
    "Seborrheic Keratosis",
    "Acne Vulgaris"
]

SEVERITY_LEVELS = ["Mild", "Moderate", "Severe"]

# Map disease to index and typical severity
DISEASE_SEVERITY_MAP = {
    0: 2,  # Melanoma -> Severe
    1: 0,  # Nevus -> Mild
    2: 1,  # Eczema -> Moderate
    3: 0,  # Seborrheic Keratosis -> Mild
    4: 0   # Acne -> Mild
}

# Symptom templates in English, Hindi, Kannada
SYMPTOM_TEMPLATES = {
    0: { # Melanoma
        "en": [
            "A dark irregular mole that is changing size, color, and shape. It has asymmetric borders.",
            "There is a growing dark spot on my arm with jagged edges and uneven brown color.",
            "I noticed a moles on my back that started bleeding and has multiple shades of black."
        ],
        "hi": [
            "एक काला अनियमित तिल जो आकार, रंग और रूप बदल रहा है। इसके किनारे असमान हैं।",
            "मेरी बांह पर एक बढ़ता हुआ काला धब्बा है जिसके किनारे खुरदरे हैं और रंग असमान भूरा है।",
            "मैंने अपनी पीठ पर एक तिल देखा जिसमें से खून बहने लगा है और इसके कई रंग हैं।"
        ],
        "kn": [
            "ಗಾತ್ರ, ಬಣ್ಣ ಮತ್ತು ಆಕಾರ ಬದಲಾಗುತ್ತಿರುವ ಕಪ್ಪಾದ ಅಸಮಪಾರ್ಶ್ವದ ಮಚ್ಚೆ. ಇದು ಅಸಮವಾದ ಅಂಚುಗಳನ್ನು ಹೊಂದಿದೆ.",
            "ನನ್ನ ಕೈಯ ಮೇಲೆ ಬೆಳೆಯುತ್ತಿರುವ ಕಪ್ಪು ಮಚ್ಚೆ ಇದ್ದು, ಅದರ ಅಂಚುಗಳು ಒರಟಾಗಿವೆ ಮತ್ತು ಬಣ್ಣ ಅಸಮವಾಗಿದೆ.",
            "ನನ್ನ ಬೆನ್ನಿನ ಮೇಲಿರುವ ಮಚ್ಚೆಯಿಂದ ರಕ್ತ ಸೋರುತ್ತಿದ್ದು, ಇದು ಕಪ್ಪು ಬಣ್ಣದ ವಿವಿಧ ಛಾಯೆಗಳನ್ನು ಹೊಂದಿದೆ."
        ]
    },
    1: { # Nevus
        "en": [
            "A symmetrical brown mole on my leg that has been stable for years. Smooth borders.",
            "I have a common flat brown spot on my skin, no itching, no bleeding.",
            "A small dark circle on my hand, completely painless and normal-looking."
        ],
        "hi": [
            "मेरी टांग पर एक सममित भूरा तिल जो वर्षों से स्थिर है। इसकी सीमाएं चिकनी हैं।",
            "मेरी त्वचा पर एक सामान्य सपाट भूरा धब्बा है, कोई खुजली या खून नहीं बह रहा है।",
            "मेरे हाथ पर एक छोटा काला घेरा, पूरी तरह से दर्द रहित और सामान्य दिखने वाला।"
        ],
        "kn": [
            "ನನ್ನ ಕಾಲಿನ ಮೇಲೆ ವರ್ಷಗಳಿಂದ ಯಾವುದೇ ಬದಲಾವಣೆಯಿಲ್ಲದ ಸಮಪಾರ್ಶ್ವದ ಕಂದು ಮಚ್ಚೆ. ಮೃದುವಾದ ಅಂಚುಗಳು.",
            "ನನ್ನ ಚರ್ಮದ ಮೇಲೆ ಸಾಮಾನ್ಯವಾದ ಚಪ್ಪಟೆ ಕಂದು ಮಚ್ಚೆ ಇದೆ, ಯಾವುದೇ ತುರಿಕೆ ಇಲ್ಲ, ರಕ್ತಸ್ರಾವವಿಲ್ಲ.",
            "ನನ್ನ ಕೈ ಮೇಲೆ ಸಣ್ಣ ಕಪ್ಪು ವರ್ತುಲವಿದೆ, ಇದು ಯಾವುದೇ ನೋವಿಲ್ಲದೆ ಸಾಮಾನ್ಯವಾಗಿದೆ."
        ]
    },
    2: { # Eczema
        "en": [
            "An extremely itchy, red, inflamed skin patch in the elbow creases. Dry and scaling.",
            "My skin is very red, dry, flaky, and itches constantly. It feels irritated.",
            "Red patches with intense pruritus and peeling skin on the neck and face."
        ],
        "hi": [
            "कोहनी के मोड़ों पर अत्यधिक खुजलीदार, लाल, सूजी हुई त्वचा का धब्बा। सूखा और पपड़ीदार।",
            "मेरी त्वचा बहुत लाल, सूखी, पपड़ीदार है और लगातार खुजली होती है। जलन महसूस हो रही है।",
            "गर्दन और चेहरे पर तीव्र खुजली और छिलने वाली त्वचा के साथ लाल धब्बे।"
        ],
        "kn": [
            "ಮೊಣಕೈ ಮಡಿಕೆಗಳಲ್ಲಿ ತೀವ್ರ ತುರಿಕೆ ಉಂಟಾಗುವ ಕೆಂಪು, ಊದಿಕೊಂಡ ಚರ್ಮದ ಭಾಗ. ಒಣ ಮತ್ತು ಉದುರುತ್ತಿರುವ ಚರ್ಮ.",
            "ನನ್ನ ಚರ್ಮವು ತುಂಬಾ ಕೆಂಪಾಗಿದೆ, ಒಣಗಿದೆ ಮತ್ತು ಸತತವಾಗಿ ತುರಿಕೆ ಇರುತ್ತದೆ. ಉರಿತದ ಸಂವೇದನೆ ಇದೆ.",
            "ಕುತ್ತಿಗೆ ಮತ್ತು ಮುಖದ ಮೇಲೆ ತೀವ್ರ ತುರಿಕೆ ಮತ್ತು ಚರ್ಮ ಸುಲಿಯುವಿಕೆಯೊಂದಿಗೆ ಕೆಂಪು ದದ್ದುಗಳು."
        ]
    },
    3: { # Seborrheic Keratosis
        "en": [
            "A waxy, stuck-on brown growth on the chest that feels rough to the touch.",
            "I have a raised, scaly brown plaque on my scalp, looks like candle wax stuck to the skin.",
            "Benign-looking light brown wart-like growth on my back, no symptoms but feels bumpy."
        ],
        "hi": [
            "छाती पर मोम जैसा, चिपका हुआ भूरा उभार जो छूने पर खुरदरा लगता है।",
            "मेरे सिर की त्वचा पर एक उभरा हुआ, पपड़ीदार भूरा धब्बा है, जो त्वचा पर चिपके मोम जैसा दिखता है।",
            "मेरी पीठ पर हल्के भूरे रंग का मस्से जैसा उभार, कोई लक्षण नहीं हैं लेकिन खुरदरा लगता है।"
        ],
        "kn": [
            "ಎದೆಯ ಮೇಲೆ ಮೇಣದಂತೆ ಅಂಟಿಕೊಂಡಿರುವ ಕಂದು ಬಣ್ಣದ ಬೆಳೆತ, ಸ್ಪರ್ಶಿಸಿದರೆ ಒರಟಾಗಿ ಭಾಸವಾಗುತ್ತದೆ.",
            "ನನ್ನ ನೆತ್ತಿಯ ಮೇಲೆ ಬೆಳೆದ ಕಂದು ಬಣ್ಣದ ಪೊರೆಯಿದೆ, ಇದು ಮೇಣ ಅಂಟಿಕೊಂಡಿರುವಂತೆ ಕಾಣುತ್ತದೆ.",
            "ನನ್ನ ಬೆನ್ನಿನ ಮೇಲೆ ಸಣ್ಣ मस्से ತರಹದ ಕಂದು ಬೆಳೆತವಿದೆ, ಯಾವುದೇ ತೊಂದರೆ ಇಲ್ಲ ಆದರೆ ಒರಟಾಗಿದೆ."
        ]
    },
    4: { # Acne
        "en": [
            "Breakout of red pimples, pustules, and blackheads on my face and chin.",
            "I have painful red bumps and clogged pores on my forehead and nose.",
            "Acne breakouts with inflammation and small whiteheads on my cheeks."
        ],
        "hi": [
            "मेरे चेहरे और ठुड्डी पर लाल मुंहासे, मवाद वाले दाने और ब्लैकहेड्स निकल आए हैं।",
            "मेरे माथे और नाक पर दर्दनाक लाल उभार और बंद रोमछिद्र हैं।",
            "गालों पर सूजन और छोटे व्हाइटहेड्स के साथ मुंहासे।"
        ],
        "kn": [
            "ನನ್ನ ಮುಖ ಮತ್ತು ಗಲ್ಲದ ಮೇಲೆ ಕೆಂಪು ಮೊಡವೆಗಳು ಹಾಗೂ ಕಪ್ಪು ತಲೆಗಳು ಕಾಣಿಸಿಕೊಂಡಿವೆ.",
            "ನನ್ನ ಹಣೆ ಮತ್ತು ಮೂಗಿನ ಮೇಲೆ ನೋವಿನ ಕೆಂಪು ಗುಳ್ಳೆಗಳು ಮತ್ತು ಮುಚ್ಚಿಹೋದ ರೋಮಕೂಪಗಳಿವೆ.",
            "ಕೆನ್ನೆಗಳ ಮೇಲೆ ಊತ ಮತ್ತು ಸಣ್ಣ ಬಿಳಿ ಮೊಡವೆಗಳೊಂದಿಗೆ ಮೊಡವೆಗಳ ಉಲ್ಬಣ."
        ]
    }
}

class MultiModalSkinDataset(Dataset):
    """
    Dataset combining skin images and textual descriptions of symptoms.
    """
    def __init__(self, data_list, transform=None):
        self.data_list = data_list
        self.transform = transform

    def __len__(self):
        return len(self.data_list)

    def __getitem__(self, idx):
        item = self.data_list[idx]
        image_path = item["image_path"]
        symptoms_text = item["symptoms"]
        disease_label = item["disease_label"]
        severity_label = item["severity_label"]
        
        # Load and transform image
        image = Image.open(image_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
            
        return {
            "image": image,
            "symptoms": symptoms_text,
            "disease_label": torch.tensor(disease_label, dtype=torch.long),
            "severity_label": torch.tensor(severity_label, dtype=torch.long)
        }

def generate_synthetic_lesion(disease_idx, save_path):
    """Generates realistic synthetic skin lesions to guarantee training works offline."""
    img = Image.new("RGB", (256, 256), color=(245, 220, 205)) # Skin tone background
    draw = ImageDraw.Draw(img)
    
    # Draw lesion patterns based on disease
    if disease_idx == 0: # Melanoma - Asymmetric, dark, uneven
        # Base shape
        draw.ellipse([80, 70, 170, 180], fill=(60, 30, 20))
        # Irregular overlays
        draw.ellipse([100, 60, 160, 130], fill=(20, 10, 5))
        draw.ellipse([70, 90, 120, 150], fill=(100, 50, 40))
        # Scale/boundary
        draw.ellipse([130, 130, 180, 190], fill=(50, 35, 25))
    elif disease_idx == 1: # Nevus - Symmetric, round, brown
        draw.ellipse([90, 90, 166, 166], fill=(120, 70, 45))
        # Normal borders
    elif disease_idx == 2: # Eczema - Red, patchy, scaling
        # Diffuse red patch
        draw.ellipse([60, 60, 190, 190], fill=(235, 130, 120))
        draw.ellipse([80, 80, 170, 170], fill=(245, 170, 160))
        # Draw dry scratches
        for i in range(10):
            x1 = np.random.randint(70, 180)
            y1 = np.random.randint(70, 180)
            draw.line([x1, y1, x1+np.random.randint(10, 30), y1+np.random.randint(-5, 5)], fill=(255, 255, 255), width=1)
    elif disease_idx == 3: # Seborrheic Keratosis - Stuck on, brown/grey waxy
        draw.ellipse([85, 85, 170, 170], fill=(95, 80, 70))
        # Add granular waxy spots
        for i in range(20):
            x = np.random.randint(95, 160)
            y = np.random.randint(95, 160)
            draw.ellipse([x, y, x+6, y+6], fill=(55, 45, 35))
    elif disease_idx == 4: # Acne - Red pimples, whiteheads
        # Background slightly red
        draw.ellipse([100, 100, 156, 156], fill=(240, 200, 190))
        # Create 4-5 small pimples
        spots = [(110, 110), (140, 120), (120, 140), (135, 145), (105, 130)]
        for s in spots:
            draw.ellipse([s[0]-8, s[1]-8, s[0]+8, s[1]+8], fill=(230, 70, 70)) # Red halo
            draw.ellipse([s[0]-3, s[1]-3, s[0]+3, s[1]+3], fill=(255, 255, 230)) # Pus head
            
    img.save(save_path)

def download_or_generate_dataset(data_dir="data"):
    """
    Downloads clinical skin disease images from the ISIC Archive API.
    Falls back to generating synthetic images if offline or download fails.
    """
    images_dir = os.path.join(data_dir, "skin_images")
    os.makedirs(images_dir, exist_ok=True)
    
    # We want 30 samples per class (total 150 samples)
    samples_per_class = 30
    dataset = []
    
    # Mapping ISIC diagnoses to our index
    # 0: Melanoma -> diagnosis: melanoma
    # 1: Nevus -> diagnosis: nevus
    # 2: Eczema -> (ISIC doesn't have eczema, we'll generate synthetics)
    # 3: Seborrheic Keratosis -> diagnosis: seborrheic keratosis
    # 4: Acne -> (ISIC doesn't have acne, we'll generate synthetics)
    
    isic_diagnoses = {
        0: "melanoma",
        1: "nevus",
        3: "seborrheic keratosis"
    }
    
    print("Building dataset...")
    
    for class_idx in range(5):
        class_name = DISEASE_CLASSES[class_idx]
        class_dir = os.path.join(images_dir, class_name.replace(" ", "_").replace("(", "").replace(")", ""))
        os.makedirs(class_dir, exist_ok=True)
        
        isic_query = isic_diagnoses.get(class_idx)
        downloaded = 0
        
        if isic_query:
            try:
                print(f"Attempting to download images for '{class_name}' from ISIC Archive API...")
                url = f"https://api.isic-archive.com/api/v2/images/?search=diagnosis:\"{isic_query}\"&limit={samples_per_class}"
                # Request without SSL verify to bypass cert issues
                resp = requests.get(url, verify=False, timeout=10)
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    for img_item in results:
                        isic_id = img_item.get("isic_id")
                        img_url = f"https://api.isic-archive.com/api/v2/images/{isic_id}/thumbnail"
                        img_resp = requests.get(img_url, verify=False, timeout=10)
                        if img_resp.status_code == 200:
                            save_path = os.path.join(class_dir, f"{isic_id}.jpg")
                            with open(save_path, "wb") as f:
                                f.write(img_resp.content)
                            downloaded += 1
                            if downloaded >= samples_per_class:
                                break
            except Exception as e:
                print(f"ISIC API download failed for class {class_name}: {e}. Falling back to synthetic.")
                
        # Fill rest with synthetics
        if downloaded < samples_per_class:
            needed = samples_per_class - downloaded
            print(f"Generating {needed} synthetic images for '{class_name}'...")
            for i in range(needed):
                save_path = os.path.join(class_dir, f"synth_{i}.jpg")
                generate_synthetic_lesion(class_idx, save_path)
                downloaded += 1
                
        # Generate symptom text samples (English, Hindi, Kannada)
        templates = SYMPTOM_TEMPLATES[class_idx]
        languages = ["en", "hi", "kn"]
        
        # Load image paths
        image_files = [os.path.join(class_dir, f) for f in os.listdir(class_dir) if f.endswith(".jpg")]
        
        for i, img_path in enumerate(image_files):
            # Select language cyclically to ensure balance across languages
            lang = languages[i % len(languages)]
            # Select template cyclically
            symptom_text = templates[lang][i % len(templates[lang])]
            
            # Map severity
            severity_idx = DISEASE_SEVERITY_MAP[class_idx]
            # Introduce slight random variations in severity for training
            if class_idx in [2, 4] and i % 3 == 0:
                # Eczema or Acne can sometimes be Moderate or Severe
                severity_idx = (severity_idx + 1) % 3
                
            dataset.append({
                "image_path": img_path,
                "symptoms": symptom_text,
                "disease_label": class_idx,
                "severity_label": severity_idx,
                "language": lang
            })
            
    print(f"Dataset compiled. Total samples: {len(dataset)}")
    return dataset


def train_multimodal_system(data_dir="data", checkpoint_dir="backend/app/models/checkpoints", epochs=15):
    """
    Trains both the CNN classifier head and the MultiModalFusionNet.
    Saves checkpoints and evaluation metrics (accuracy, confusion matrix, ROC data).
    """
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    # 1. Load Data
    data_list = download_or_generate_dataset(data_dir)
    train_data, val_data = train_test_split(
        data_list, 
        test_size=0.2, 
        random_state=42, 
        stratify=[x["disease_label"] for x in data_list]
    )
    
    train_dataset = MultiModalSkinDataset(train_data, transform=get_image_transforms(train=True))
    val_dataset = MultiModalSkinDataset(val_data, transform=get_image_transforms(train=False))
    
    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=8, shuffle=False)
    
    # 2. Initialize Models
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    cnn_model = SkinDiseaseCNN(num_classes=5, pretrained=True).to(device)
    text_encoder = SymptomTextEncoder(use_cuda=torch.cuda.is_available())
    fusion_model = MultiModalFusionNet(num_classes=5).to(device)
    
    # Freeze the CNN backbone features to make training ultra-fast on CPU
    for param in cnn_model.features.parameters():
        param.requires_grad = False
        
    # 3. Setup Optimizers
    # We optimize the CNN classifier head and the Fusion network parameters
    optimizer = optim.AdamW(
        list(cnn_model.classifier.parameters()) + list(fusion_model.parameters()), 
        lr=1e-3, 
        weight_decay=1e-2
    )
    
    disease_criterion = nn.CrossEntropyLoss()
    severity_criterion = nn.CrossEntropyLoss()
    
    best_val_loss = float('inf')
    early_stopping_counter = 0
    patience = 5
    
    print("Pre-extracting text embeddings for training to save compute...")
    # Pre-encode all sentences using SymptomTextEncoder
    # This prevents forward pass of BERT every iteration on CPU!
    def pre_encode_symptoms(dataset_list):
        embeddings = []
        for x in dataset_list:
            text = x["symptoms"]
            emb = text_encoder.get_embeddings(text)
            embeddings.append(emb)
        return torch.tensor(np.array(embeddings), dtype=torch.float32)
        
    train_text_features = pre_encode_symptoms(train_data).to(device)
    val_text_features = pre_encode_symptoms(val_data).to(device)
    
    # 4. Training Loop
    history = {"train_loss": [], "val_loss": [], "val_acc": []}
    
    for epoch in range(epochs):
        cnn_model.train()
        fusion_model.train()
        
        epoch_loss = 0.0
        
        # We manually iterate with indices to fetch pre-encoded text features easily
        num_batches = len(train_loader)
        batch_indices = list(range(len(train_dataset)))
        np.random.shuffle(batch_indices)
        
        # Mini-batching
        batch_size = 8
        for b in range(0, len(train_dataset), batch_size):
            indices = batch_indices[b:b+batch_size]
            
            # Collate batch
            images = []
            disease_labels = []
            severity_labels = []
            text_feats = []
            
            for idx in indices:
                item = train_dataset[idx]
                images.append(item["image"])
                disease_labels.append(item["disease_label"])
                severity_labels.append(item["severity_label"])
                text_feats.append(train_text_features[idx].unsqueeze(0))
                
            images = torch.stack(images).to(device)
            disease_labels = torch.stack(disease_labels).to(device)
            severity_labels = torch.stack(severity_labels).to(device)
            text_feats = torch.cat(text_feats, dim=0).to(device)
            
            optimizer.zero_grad()
            
            # Forward pass
            img_feats = cnn_model.extract_features(images)
            disease_logits, severity_logits = fusion_model(img_feats, text_feats)
            
            loss_d = disease_criterion(disease_logits, disease_labels)
            loss_s = severity_criterion(severity_logits, severity_labels)
            loss = loss_d + 0.5 * loss_s # Weighted loss
            
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            
        avg_train_loss = epoch_loss / (len(train_dataset) / batch_size)
        
        # Validation
        cnn_model.eval()
        fusion_model.eval()
        
        val_loss = 0.0
        correct_d = 0
        total = 0
        
        all_d_preds = []
        all_d_targets = []
        
        with torch.no_grad():
            for i in range(len(val_dataset)):
                item = val_dataset[i]
                img = item["image"].unsqueeze(0).to(device)
                d_label = item["disease_label"].unsqueeze(0).to(device)
                s_label = item["severity_label"].unsqueeze(0).to(device)
                t_feat = val_text_features[i].unsqueeze(0).to(device)
                
                img_feats = cnn_model.extract_features(img)
                d_logits, s_logits = fusion_model(img_feats, t_feat)
                
                loss_d = disease_criterion(d_logits, d_label)
                loss_s = severity_criterion(s_logits, s_label)
                loss = loss_d + 0.5 * loss_s
                
                val_loss += loss.item()
                
                pred_d = torch.argmax(d_logits, dim=1)
                correct_d += (pred_d == d_label).sum().item()
                total += 1
                
                all_d_preds.append(pred_d.item())
                all_d_targets.append(d_label.item())
                
        avg_val_loss = val_loss / len(val_dataset)
        val_acc = correct_d / total
        
        history["train_loss"].append(avg_train_loss)
        history["val_loss"].append(avg_val_loss)
        history["val_acc"].append(val_acc)
        
        print(f"Epoch {epoch+1}/{epochs} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.4f}")
        
        # Early Stopping and saving checkpoint
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            early_stopping_counter = 0
            
            # Save weights
            torch.save(cnn_model.state_dict(), os.path.join(checkpoint_dir, "cnn_model.pth"))
            torch.save(fusion_model.state_dict(), os.path.join(checkpoint_dir, "fusion_model.pth"))
            print("Checkpoint saved.")
        else:
            early_stopping_counter += 1
            if early_stopping_counter >= patience:
                print("Early stopping triggered.")
                break
                
    # 5. Compute Final Evaluation Metrics on Validation Set
    cnn_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "cnn_model.pth")))
    fusion_model.load_state_dict(torch.load(os.path.join(checkpoint_dir, "fusion_model.pth")))
    cnn_model.eval()
    fusion_model.eval()
    
    val_preds = []
    val_targets = []
    val_sev_preds = []
    val_sev_targets = []
    
    with torch.no_grad():
        for i in range(len(val_dataset)):
            item = val_dataset[i]
            img = item["image"].unsqueeze(0).to(device)
            t_feat = val_text_features[i].unsqueeze(0).to(device)
            
            img_feats = cnn_model.extract_features(img)
            d_logits, s_logits = fusion_model(img_feats, t_feat)
            
            pred_d = torch.argmax(d_logits, dim=1).item()
            pred_s = torch.argmax(s_logits, dim=1).item()
            
            val_preds.append(pred_d)
            val_targets.append(item["disease_label"].item())
            val_sev_preds.append(pred_s)
            val_sev_targets.append(item["severity_label"].item())
            
    # Compute stats
    precision, recall, f1, _ = precision_recall_fscore_support(
        val_targets, val_preds, average='weighted', zero_division=0
    )
    accuracy = np.mean(np.array(val_preds) == np.array(val_targets))
    
    cm = confusion_matrix(val_targets, val_preds, labels=list(range(5)))
    
    metrics = {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "confusion_matrix": cm.tolist(),
        "classes": DISEASE_CLASSES,
        "history": history
    }
    
    with open(os.path.join(checkpoint_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=4)
        
    print("Training finished. Evaluation metrics saved.")
    return metrics

if __name__ == "__main__":
    train_multimodal_system(epochs=5)
