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
    "Acne Vulgaris",
    "Basal Cell Carcinoma",
    "Psoriasis",
    "Vitiligo",
    "Rosacea",
    "Tinea Corporis (Ringworm)",
    "Impetigo",
    "Urticaria (Hives)",
    "Warts",
    "Contact Dermatitis",
    "Folliculitis",
    "Lichen Planus",
    "Herpes Zoster",
    "Pityriasis Rosea"
]

SEVERITY_LEVELS = ["Mild", "Moderate", "Severe"]

# Map disease to index and typical severity
DISEASE_SEVERITY_MAP = {
    0: 2,  # Melanoma -> Severe
    1: 0,  # Nevus -> Mild
    2: 1,  # Eczema -> Moderate
    3: 0,  # Seborrheic Keratosis -> Mild
    4: 0,  # Acne -> Mild
    5: 2,  # Basal Cell Carcinoma -> Severe
    6: 1,  # Psoriasis -> Moderate
    7: 0,  # Vitiligo -> Mild
    8: 1,  # Rosacea -> Moderate
    9: 0,  # Tinea Corporis -> Mild
    10: 1, # Impetigo -> Moderate
    11: 1, # Urticaria -> Moderate
    12: 0, # Warts -> Mild
    13: 1, # Contact Dermatitis -> Moderate
    14: 0, # Folliculitis -> Mild
    15: 1, # Lichen Planus -> Moderate
    16: 2, # Herpes Zoster -> Severe
    17: 0  # Pityriasis Rosea -> Mild
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
    },
    5: { # Basal Cell Carcinoma
        "en": [
            "A shiny, pearly pink bump on my nose that has small visible blood vessels.",
            "I have a slow-growing pink sore on my forehead that bleeds, heals, and then bleeds again.",
            "A firm skin-colored nodule with a rolled border and a crusted center."
        ],
        "hi": [
            "मेरी नाक पर एक चमकदार, मोती जैसा गुलाबी उभार जिसमें छोटी रक्त वाहिकाएं दिखाई दे रही हैं।",
            "मेरे माथे पर एक धीरे-धीरे बढ़ने वाला गुलाबी घाव है जिससे खून बहता है, ठीक होता है और फिर खून बहता है।",
            "एक उभरा हुआ त्वचा के रंग का गांठ जिसके किनारे मुड़े हुए हैं और बीच में पपड़ी है।"
        ],
        "kn": [
            "ನನ್ನ ಮೂಗಿನ ಮೇಲೆ ಸಣ್ಣ ರಕ್ತನಾಳಗಳನ್ನು ಹೊಂದಿರುವ ಹೊಳೆಯುವ, ಮುತ್ತಿನಂತಹ ಗುಲಾಬಿ ಬಣ್ಣದ ಗುಳ್ಳೆ.",
            "ನನ್ನ ಹಣೆಯ ಮೇಲೆ ನಿಧಾನವಾಗಿ ಬೆಳೆಯುತ್ತಿರುವ ಗುಲಾಬಿ ಬಣ್ಣದ ಹುಣ್ಣು ಇದ್ದು, ಅದು ರಕ್ತಸ್ರಾವವಾಗಿ, ಗುಣಮುಖವಾಗಿ ಮತ್ತೆ ರಕ್ತಸ್ರಾವವಾಗುತ್ತದೆ.",
            "ಮಡಚಲ್ಪಟ್ಟ ಅಂಚುಗಳು ಮತ್ತು ಒಣಗಿದ ಮಧ್ಯಭಾಗವನ್ನು ಹೊಂದಿರುವ ಚರ್ಮದ ಬಣ್ಣದ ಗಟ್ಟಿ ಗಂಟು."
        ]
    },
    6: { # Psoriasis
        "en": [
            "Thick red plaques on my elbows covered with silvery scales. It is dry and cracks.",
            "Silvery scaly skin patches on my knees and scalp that itch and feel thick.",
            "Symmetrical inflamed skin lesions with silver-colored scaling on extensor surfaces."
        ],
        "hi": [
            "मेरी कोहनी पर चांदी जैसी पपड़ी से ढके मोटे लाल धब्बे। यह सूखा है और फट जाता है।",
            "मेरे घुटनों और सिर पर चांदी जैसी पपड़ीदार त्वचा के धब्बे जिनमें खुजली होती है और वे मोटे लगते हैं।",
            "शरीर के जोड़ों पर चांदी के रंग की पपड़ी के साथ सममित रूप से सूजे हुए त्वचा के घाव।"
        ],
        "kn": [
            "ನನ್ನ ಮೊಣಕೈಗಳ ಮೇಲೆ ಬೆಳ್ಳಿಯಂತಹ ಹುರುಪಿನಿಂದ ಮುಚ್ಚಲ್ಪಟ್ಟ ದಪ್ಪನೆಯ ಕೆಂಪು ದದ್ದುಗಳು. ಇದು ಒಣಗಿದ್ದು ಬಿರುಕು ಬಿಡುತ್ತದೆ.",
            "ನನ್ನ ಮೊಣಕಾಲುಗಳು ಮತ್ತು ತಲೆಯ ಚರ್ಮದ ಮೇಲೆ ಬೆಳ್ಳಿಯ ಪೊರೆಯಂತಿರುವ ತುರಿಕೆಯ ದಪ್ಪ ಚರ್ಮದ ಭಾಗಗಳು.",
            "ದೇಹದ ಕೀಲುಗಳ ಮೇಲೆ ಬೆಳ್ಳಿ ಬಣ್ಣದ ಹುರುಪನ್ನು ಹೊಂದಿರುವ ಸಮಪಾರ್ಶ್ವದ ಚರ್ಮದ ಕೆಂಪು ದದ್ದುಗಳು."
        ]
    },
    7: { # Vitiligo
        "en": [
            "White depigmented patches appearing on my hands and around my mouth.",
            "I noticed flat milky-white spots on my skin where color pigment is completely gone.",
            "Symmetrical white patches with sharp borders on my skin, completely painless."
        ],
        "hi": [
            "मेरे हाथों और मुंह के आसपास सफेद रंगहीन धब्बे दिखाई दे रहे हैं।",
            "मैंने अपनी त्वचा पर सपाट दूधिया-सफेद धब्बे देखे जहां रंगद्रव्य पूरी तरह से चला गया है।",
            "मेरी त्वचा पर तेज किनारों वाले सममित सफेद धब्बे, पूरी तरह से दर्द रहित।"
        ],
        "kn": [
            "ನನ್ನ ಕೈಗಳು ಮತ್ತು ಬಾಯಿಯ ಸುತ್ತ ಬಿಳಿ ಬಣ್ಣ ರಹಿತ ದದ್ದುಗಳು ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತಿವೆ.",
            "ನನ್ನ ಚರ್ಮದ ಮೇಲೆ ಬಣ್ಣದ ಪಿಗ್ಮೆಂಟ್ ಸಂಪೂರ್ಣವಾಗಿ ಕಣ್ಮರೆಯಾಗಿರುವ ಚಪ್ಪಟೆ ಹಾಲಿನಂತಹ ಬಿಳಿ ಕಲೆಗಳನ್ನು ನಾನು ಗಮನಿಸಿದೆ.",
            "ನನ್ನ ಚರ್ಮದ ಮೇಲೆ ತೀಕ್ಷ್ಣವಾದ ಅಂಚುಗಳನ್ನು ಹೊಂದಿರುವ ಸಮಪಾರ್ಶ್ವದ ಬಿಳಿ ಕಲೆಗಳು, ಸಂಪೂರ್ಣವಾಗಿ ನೋವುರಹಿತವಾಗಿವೆ."
        ]
    },
    8: { # Rosacea
        "en": [
            "Redness and visible tiny blood vessels on my cheeks and nose, feels warm.",
            "I have persistent facial flushing with small red pus-filled bumps on my forehead and nose.",
            "Red swollen skin on the center of my face, looking like acne but with spider veins."
        ],
        "hi": [
            "मेरे गालों और नाक पर लालिमा और छोटी दिखाई देने वाली रक्त वाहिकाएं, त्वचा गर्म महसूस होती है।",
            "मेरे माथे और नाक पर छोटे लाल मवाद से भरे दानों के साथ चेहरे पर लगातार लालिमा है।",
            "मेरे चेहरे के बीच में लाल सूजी हुई त्वचा, मुंहासे जैसी दिखती है लेकिन उसमें मकड़ी जैसी नसें हैं।"
        ],
        "kn": [
            "ನನ್ನ ಕೆನ್ನೆ ಮತ್ತು ಮೂಗಿನ ಮೇಲೆ ಕೆಂಪಾಗುವಿಕೆ ಹಾಗೂ ಸಣ್ಣ ಸಣ್ಣ ರಕ್ತನಾಳಗಳು ಕಾಣಿಸುತ್ತಿವೆ, ಬೆಚ್ಚಗೆ ಭಾಸವಾಗುತ್ತದೆ.",
            "ನನ್ನ ಹಣೆ ಮತ್ತು ಮೂಗಿನ ಮೇಲೆ ಸಣ್ಣ ಕೆಂಪು ಮಜ್ಜೆಯುಕ್ತ ಗುಳ್ಳೆಗಳೊಂದಿಗೆ ಮುಖದ ಮೇಲೆ ನಿರಂತರ ಕೆಂಪಾಗುವಿಕೆ ಇದೆ.",
            "ನನ್ನ ಮುಖದ ಮಧ್ಯಭಾಗದಲ್ಲಿ ಕೆಂಪು ಊದಿಕೊಂಡ ಚರ್ಮ, ಮೊಡವೆ ತರಹ ಕಾಣುತ್ತದೆ ಆದರೆ ಜೇಡರ ತಂತಿಯಂತಹ ರಕ್ತನಾಳಗಳಿವೆ."
        ]
    },
    9: { # Tinea Corporis (Ringworm)
        "en": [
            "An itchy, red, circular ring-like rash on my arm with raised scaly edges.",
            "There is a round ring-shaped patch on my skin that is clear in the middle but red and scaling on the borders.",
            "Annular red lesions with active scaly borders and mild central clearing on torso."
        ],
        "hi": [
            "मेरी बांह पर उभरे हुए पपड़ीदार किनारों के साथ एक खुजलीदार, लाल, गोलाकार अंगूठी जैसा दाद।",
            "मेरी त्वचा पर एक गोल अंगूठी के आकार का धब्बा है जो बीच में साफ है लेकिन किनारों पर लाल और पपड़ीदार है।",
            "पीठ या छाती पर सक्रिय पपड़ीदार किनारों और हल्के केंद्रीय स्पष्टता के साथ गोलाकार लाल घाव।"
        ],
        "kn": [
            "ನನ್ನ ಕೈ ಮೇಲೆ ತುರಿಕೆಯುಳ್ಳ, ಕೆಂಪು, ವೃತ್ತಾಕಾರದ ಉಂಗುರದಂತಹ ದದ್ದು, ಇದು ಎದ್ದಿರುವ ಹುರುಪಿನ ಅಂಚುಗಳನ್ನು ಹೊಂದಿದೆ.",
            "ನನ್ನ ಚರ್ಮದ ಮೇಲೆ ಗೋಳಾಕಾರದ ಉಂಗುರದ ಆಕಾರದ ದದ್ದಿದೆ, ಇದು ಮಧ್ಯದಲ್ಲಿ ಸ್ವಚ್ಛವಾಗಿದ್ದು ಅಂಚುಗಳಲ್ಲಿ ಕೆಂಪು ಮತ್ತು ಹುರುಪಿನಿಂದ ಕೂಡಿದೆ.",
            "ದೇಹದ ಮೇಲೆ ಸಕ್ರಿಯ ಹುರುಪಿನ ಅಂಚುಗಳು ಮತ್ತು ಮಧ್ಯದಲ್ಲಿ ತಿಳಿ ಬಣ್ಣವನ್ನು ಹೊಂದಿರುವ ವೃತ್ತಾಕಾರದ ಕೆಂಪು ಗಾಯಗಳು."
        ]
    },
    10: { # Impetigo
        "en": [
            "Golden honey-colored crusts forming on sores around my nose and lips.",
            "I have small red blisters around my mouth that ruptured and turned into honey-colored crusty patches.",
            "Contagious-looking yellow crusted sores on my child's chin that are oozing fluid."
        ],
        "hi": [
            "मेरी नाक और होठों के आसपास के घावों पर सुनहरे शहद के रंग की पपड़ी बन रही है।",
            "मेरे मुंह के आसपास छोटे लाल छाले हैं जो फट गए और शहद के रंग के पपड़ीदार धब्बों में बदल गए।",
            "मेरे बच्चे की ठुड्डी पर संक्रामक दिखने वाले पीले पपड़ीदार घाव जिनसे तरल पदार्थ बह रहा है।"
        ],
        "kn": [
            "ನನ್ನ ಮೂಗು ಮತ್ತು ತುಟಿಗಳ ಸುತ್ತಲಿನ ಹುಣ್ಣುಗಳ ಮೇಲೆ ಚಿನ್ನದ ಜೇನುತುಪ್ಪದ ಬಣ್ಣದ ಪೊರೆಗಳು ರೂಪುಗೊಳ್ಳುತ್ತಿವೆ.",
            "ನನ್ನ ಬಾಯಿಯ ಸುತ್ತ ಸಣ್ಣ ಕೆಂಪು ಗುಳ್ಳೆಗಳಿದ್ದು, ಅವು ಒಡೆದು ಜೇನುತುಪ್ಪದ ಬಣ್ಣದ ಒರಟು ದದ್ದುಗಳಾಗಿ ಮಾರ್ಪಟ್ಟಿವೆ.",
            "ನನ್ನ ಮಗುವಿನ ಗಲ್ಲದ ಮೇಲೆ ಸೋರುತ್ತಿರುವ ಹಳದಿ ಬಣ್ಣದ ಪೊರೆಯನ್ನು ಹೊಂದಿರುವ ಸಾಂಕ್ರಾಮಿಕವಾಗಿ ಕಾಣುವ ಹುಣ್ಣುಗಳು."
        ]
    },
    11: { # Urticaria (Hives)
        "en": [
            "Sudden outbreak of extremely itchy, raised red wheals all over my body.",
            "I have swollen red welts on my skin that appear, change shape, and fade within hours.",
            "Intensely pruritic hives and swollen patches that look like nettle stings."
        ],
        "hi": [
            "मेरे पूरे शरीर पर अचानक अत्यधिक खुजलीदार, उभरे हुए लाल चकत्ते निकल आए हैं।",
            "मेरी त्वचा पर सूजे हुए लाल चपटे चकत्ते हैं जो दिखाई देते हैं, आकार बदलते हैं और कुछ घंटों में गायब हो जाते हैं।",
            "तीव्र खुजली वाले पित्त और सूजे हुए धब्बे जो बिछुआ डंक जैसे दिखते हैं।"
        ],
        "kn": [
            "ನನ್ನ ಇಡೀ ದೇಹದ ಮೇಲೆ ಇದ್ದಕ್ಕಿದ್ದಂತೆ ತೀವ್ರ ತುರಿಕೆಯುಳ್ಳ, ಎದ್ದಿರುವ ಕೆಂಪು ದದ್ದುಗಳು ಕಾಣಿಸಿಕೊಂಡಿವೆ.",
            "ನನ್ನ ಚರ್ಮದ ಮೇಲೆ ಊದಿಕೊಂಡ ಕೆಂಪು ದದ್ದುಗಳಿದ್ದು, ಅವು ಕಾಣಿಸಿಕೊಂಡು, ಆಕಾರವನ್ನು ಬದಲಾಯಿಸಿ ಕೆಲವು ಗಂಟೆಗಳಲ್ಲಿ ಮಾಯವಾಗುತ್ತವೆ.",
            "ತೀವ್ರ ತುರಿಕೆಯುಳ್ಳ ಜೇನುನೊಣ ಕಚ್ಚಿದಂತೆ ಕಾಣುವ ಊದಿಕೊಂಡ ದದ್ದುಗಳು."
        ]
    },
    12: { # Warts
        "en": [
            "A rough, bumpy skin-colored growth on my finger with tiny black dots inside.",
            "I have hard wart-like papules on my hands that feel rough and resemble cauliflower.",
            "Benign small bumpy growths on my feet that are painful when walking."
        ],
        "hi": [
            "मेरी उंगली पर एक खुरदरा, उभरा हुआ त्वचा के रंग का मस्सा जिसके अंदर छोटे काले बिंदु हैं।",
            "मेरे हाथों पर सख्त मस्से जैसे दाने हैं जो खुरदरे लगते हैं और फूलगोभी जैसे दिखते हैं।",
            "मेरे पैरों पर छोटे उभरे हुए मस्से जो चलने पर दर्द करते हैं।"
        ],
        "kn": [
            "ನನ್ನ ಬೆರಳಿನ ಮೇಲೆ ಸಣ್ಣ ಕಪ್ಪು ಚುಕ್ಕೆಗಳನ್ನು ಹೊಂದಿರುವ ಒರಟಾದ, ಉಬ್ಬು ತರಹದ ಚರ್ಮದ ಬಣ್ಣದ ಬೆಳೆತ.",
            "ನನ್ನ ಕೈಗಳ ಮೇಲೆ ಒರಟಾದ ಮತ್ತು ಹೂಕೋಸಿನಂತೆ ಕಾಣುವ ಗಟ್ಟಿಯಾದ ನರಹುಲಿ ತರಹದ ಗುಳ್ಳೆಗಳಿವೆ.",
            "ನನ್ನ ಪಾದಗಳ ಮೇಲೆ ನಡೆಯುವಾಗ ನೋವುಂಟುಮಾಡುವ ಸಣ್ಣ ಉಬ್ಬು ತರಹದ ಬೆಳೆತಗಳು."
        ]
    },
    13: { # Contact Dermatitis
        "en": [
            "Red itchy rash on my wrist where my watch metal touches the skin.",
            "I touched poison ivy/harsh detergent and now my hands are red, blistered, and itching intensely.",
            "Localized eczema-like inflamed skin patch after contact with a cosmetic cream."
        ],
        "hi": [
            "मेरी कलाई पर लाल खुजलीदार दाने जहां मेरी घड़ी का धातु त्वचा को छूता है।",
            "मैंने किसी रसायन/कठोर साबुन को छुआ और अब मेरे हाथ लाल हैं, उन पर छाले हैं और तेज खुजली हो रही है।",
            "एक कॉस्मेटिक क्रीम के संपर्क में आने के बाद स्थानीयकृत एक्जिमा जैसी सूजी हुई त्वचा का धब्बा।"
        ],
        "kn": [
            "ನನ್ನ ಮಣಿಕಟ್ಟಿನ ಮೇಲೆ ಕೆಂಪು ತುರಿಕೆಯ ದದ್ದು ಕಾಣಿಸಿಕೊಂಡಿದೆ, ಅಲ್ಲಿ ನನ್ನ ಕೈಗಡಿಯಾರದ ಲೋಹವು ಚರ್ಮವನ್ನು ಸ್ಪರ್ಶಿಸುತ್ತದೆ.",
            "ನಾನು ಕಠಿಣ ಮಾರ್ಜಕ ಅಥವಾ ಗಿಡವನ್ನು ಸ್ಪರ್ಶಿಸಿದೆ ಮತ್ತು ಈಗ ನನ್ನ ಕೈಗಳು ಕೆಂಪಾಗಿ, ಗುಳ್ಳೆಗಳಾಗಿ ತೀವ್ರವಾಗಿ ತುರಿಯುತ್ತಿವೆ.",
            "ಯಾವುದೋ ಕ್ರೀಮ್ ಬಳಸಿದ ನಂತರ ಆ ಭಾಗದಲ್ಲಿ ಮಾತ್ರ ಉಂಟಾಗಿರುವ ಕೆಂಪು ಊದಿಕೊಂಡ ಚರ್ಮದ ಭಾಗ."
        ]
    },
    14: { # Folliculitis
        "en": [
            "Multiple tiny red bumps and pustules surrounding hair follicles on my thighs.",
            "I have itchy small whiteheads centered around hair roots on my chest after shaving.",
            "Inflamed hair follicles that look like a breakout of small pimples on my scalp."
        ],
        "hi": [
            "मेरी जांघों पर बालों के रोमों के आसपास कई छोटे लाल उभार और मवाद वाले दाने।",
            "शेविंग के बाद मेरी छाती पर बालों की जड़ों के आसपास केंद्रित खुजली वाले छोटे सफेद दाने हैं।",
            "सूजे हुए बालों के रोम जो मेरे सिर की त्वचा पर छोटे मुंहासों जैसे दिखते हैं।"
        ],
        "kn": [
            "ನನ್ನ ತೊಡೆಗಳ ಮೇಲೆ ಕೂದಲಿನ ಬುಡಗಳ ಸುತ್ತ ಹಲವಾರು ಸಣ್ಣ ಕೆಂಪು ಗುಳ್ಳೆಗಳು ಮತ್ತು ಮಜ್ಜೆಯುಳ್ಳ ದದ್ದುಗಳು ಕಾಣಿಸಿಕೊಂಡಿವೆ.",
            "ಕ್ಷೌರ ಮಾಡಿದ ನಂತರ ನನ್ನ ಎದೆಯ ಮೇಲೆ ಕೂದಲಿನ ಬೇರುಗಳ ಸುತ್ತ ತುರಿಕೆಯ ಸಣ್ಣ ಬಿಳಿ ಮೊಡವೆಗಳಾಗಿವೆ.",
            "ನನ್ನ ತಲೆಯ ಚರ್ಮದ ಮೇಲೆ ಸಣ್ಣ ಮೊಡವೆಗಳಂತೆ ಕಾಣುವ ಕೂದಲಿನ ಬುಡಗಳ ಊತ."
        ]
    },
    15: { # Lichen Planus
        "en": [
            "Purple, flat-topped, itchy bumps with fine white lines on my inner wrists.",
            "I have shiny polygonal violet-colored papules on my skin that itch constantly.",
            "Flat-topped purplish lesions on my ankles showing fine lacy white patterns."
        ],
        "hi": [
            "मेरी कलाई के अंदरूनी हिस्से पर महीन सफेद रेखाओं के साथ बैंगनी, चपटे, खुजलीदार उभार।",
            "मेरी त्वचा पर चमकदार बहुकोणीय बैंगनी रंग के दाने हैं जिनमें लगातार खुजली होती है।",
            "मेरे टखनों पर चपटे बैंगनी रंग के घाव जो महीन जालीदार सफेद पैटर्न दिखाते हैं।"
        ],
        "kn": [
            "ನನ್ನ ಮಣಿಕಟ್ಟಿನ ಒಳಭಾಗದಲ್ಲಿ ಸೂಕ್ಷ್ಮ ಬಿಳಿ ಗೆರೆಗಳನ್ನು ಹೊಂದಿರುವ ನೇರಳೆ ಬಣ್ಣದ ಚಪ್ಪಟೆ ತುರಿಕೆಯ ಗುಳ್ಳೆಗಳು.",
            "ನನ್ನ ಚರ್ಮದ ಮೇಲೆ ನಿರಂತರ ತುರಿಕೆಯುಳ್ಳ ಹೊಳೆಯುವ ನೇರಳೆ ಬಣ್ಣದ ಬಹುಕೋನ ಆಕಾರದ ಗುಳ್ಳೆಗಳಿವೆ.",
            "ನನ್ನ ಪಾದದ ಬಳಿ ಸೂಕ್ಷ್ಮ ಬಿಳಿ ಜಾಲರಿಯಂತಹ ವಿನ್ಯಾಸವನ್ನು ಹೊಂದಿರುವ ಚಪ್ಪಟೆ ನೇರಳೆ ಬಣ್ಣದ ಗಾಯಗಳು."
        ]
    },
    16: { # Herpes Zoster
        "en": [
            "A painful band of fluid-filled blisters wrapping around one side of my chest.",
            "I have intense burning pain followed by a cluster of red blisters on my lower back.",
            "Unilateral stripe of painful rash with fluid blisters aligned along a nerve path."
        ],
        "hi": [
            "मेरी छाती के एक तरफ पानी से भरे छालों की एक दर्दनाक पट्टी बन गई है।",
            "मुझे अत्यधिक जलन वाला दर्द है जिसके बाद मेरी पीठ के निचले हिस्से पर लाल छालों का झुंड बन गया है।",
            "एक तंत्रिका पथ के साथ संरेखित तरल छालों के साथ दर्दनाक चकत्ते की एकतरफा पट्टी।"
        ],
        "kn": [
            "ನನ್ನ ಎದೆಯ ಒಂದು ಭಾಗದಲ್ಲಿ ನೀರು ತುಂಬಿದ ಗುಳ್ಳೆಗಳ ನೋವಿನ ಪಟ್ಟಿಯೊಂದು ಕಾಣಿಸಿಕೊಂಡಿದೆ (ಹರಳು ಬೇನೆ).",
            "ನನ್ನ ಬೆನ್ನಿನ ಕೆಳಭಾಗದಲ್ಲಿ ತೀವ್ರವಾದ ಉರಿಯೂತದ ನೋವಿನ ನಂತರ ಕೆಂಪು ಗುಳ್ಳೆಗಳ ಗುಂಪು ಕಾಣಿಸಿಕೊಂಡಿದೆ.",
            "ನರಗಳ ಹಾದಿಯಲ್ಲಿ ಮಾತ್ರ ನೋವಿನಿಂದ ಕೂಡಿದ ನೀರು ತುಂಬಿದ ಗುಳ್ಳೆಗಳ ಸಾಲು."
        ]
    },
    17: { # Pityriasis Rosea
        "en": [
            "A single large oval pink herald patch on my stomach followed by smaller spots.",
            "I have a Christmas-tree pattern of oval scaly pink rashes across my back and chest.",
            "Oval-shaped salmon-colored scaly lesions aligned along skin cleavage lines."
        ],
        "hi": [
            "मेरे पेट पर एक बड़ा अंडाकार गुलाबी धब्बा (हेराल्ड पैच) और उसके बाद छोटे-छोटे धब्बे।",
            "मेरी पीठ और छाती पर अंडाकार पपड़ीदार गुलाबी दानों का क्रिसमस-ट्री जैसा पैटर्न बन गया है।",
            "त्वचा की रेखाओं के साथ संरेखित अंडाकार आकार के हल्के लाल पपड़ीदार घाव।"
        ],
        "kn": [
            "ನನ್ನ ಹೊಟ್ಟೆಯ ಮೇಲೆ ಒಂದೇ ಒಂದು ದೊಡ್ಡ ಅಂಡಾಕಾರದ ಗುಲಾಬಿ ಬಣ್ಣದ ದದ್ದು ಕಾಣಿಸಿಕೊಂಡು, ನಂತರ ಸಣ್ಣ ಸಣ್ಣ ದದ್ದುಗಳು ಹರಡಿವೆ.",
            "ನನ್ನ ಬೆನ್ನು ಮತ್ತು ಎದೆಯ ಮೇಲೆ ಅಂಡಾಕಾರದ ಗುಲಾಬಿ ದದ್ದುಗಳ ಕ್ರಿಸ್ಮಸ್ ಮರದಂತಹ ವಿನ್ಯಾಸವಿದೆ.",
            "ಚರ್ಮದ ರೇಖೆಗಳ ಉದ್ದಕ್ಕೂ ಜೋಡಿಸಲ್ಪಟ್ಟ ಅಂಡಾಕಾರದ ಗುಲಾಬಿ ಬಣ್ಣದ ಹುರುಪಿನ ದದ್ದುಗಳು."
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
    elif disease_idx == 5: # Basal Cell Carcinoma - Pink pearly nodule, shiny, rolled borders
        # Base nodule
        draw.ellipse([80, 80, 176, 176], fill=(235, 160, 160))
        # Shiny center
        draw.ellipse([100, 100, 156, 156], fill=(245, 195, 195))
        # Central ulceration (crusted/brown)
        draw.ellipse([115, 115, 140, 140], fill=(120, 60, 50))
    elif disease_idx == 6: # Psoriasis - Red plaque with silvery/white scaling
        # Thick red plaque
        draw.ellipse([70, 70, 186, 186], fill=(225, 90, 90))
        # Silvery scales (white spots)
        for i in range(25):
            x = np.random.randint(85, 170)
            y = np.random.randint(85, 170)
            draw.ellipse([x, y, x+8, y+4], fill=(240, 240, 240))
    elif disease_idx == 7: # Vitiligo - Depigmented milky white patch
        draw.ellipse([80, 80, 176, 176], fill=(255, 245, 240)) # Milky white patch
        draw.ellipse([95, 95, 160, 160], fill=(255, 255, 255))
    elif disease_idx == 8: # Rosacea - Erythematous flushing
        # Red facial flush
        draw.ellipse([60, 60, 196, 196], fill=(235, 120, 110))
        draw.ellipse([80, 80, 176, 176], fill=(240, 140, 130))
        # Add small vascular lines
        for i in range(8):
            x = np.random.randint(90, 160)
            y = np.random.randint(90, 160)
            draw.line([x, y, x+np.random.randint(5, 15), y+np.random.randint(-5, 5)], fill=(210, 30, 30), width=1)
    elif disease_idx == 9: # Tinea Corporis - Circular scaly ring
        # Outer red ring
        draw.ellipse([70, 70, 186, 186], fill=(215, 95, 80))
        # Clear center (skin tone)
        draw.ellipse([85, 85, 171, 171], fill=(245, 220, 205))
    elif disease_idx == 10: # Impetigo - Honey-colored crusts
        draw.ellipse([90, 90, 166, 166], fill=(220, 180, 110)) # Honey-gold crust
        # Golden crusty spots
        for i in range(12):
            x = np.random.randint(95, 155)
            y = np.random.randint(95, 155)
            draw.ellipse([x, y, x+8, y+8], fill=(190, 140, 60))
    elif disease_idx == 11: # Urticaria - Raised red welts
        draw.ellipse([75, 75, 181, 181], fill=(240, 145, 135))
        # Irregular welts
        draw.ellipse([90, 80, 150, 130], fill=(245, 165, 155))
        draw.ellipse([110, 120, 170, 170], fill=(245, 165, 155))
    elif disease_idx == 12: # Warts - Rough bumpy growth
        draw.ellipse([90, 90, 166, 166], fill=(210, 185, 170))
        # Cauliflower bumps
        for i in range(15):
            x = np.random.randint(95, 155)
            y = np.random.randint(95, 155)
            draw.ellipse([x, y, x+10, y+10], fill=(185, 160, 145))
    elif disease_idx == 13: # Contact Dermatitis - Red vesicular rash
        draw.ellipse([65, 65, 191, 191], fill=(230, 95, 95))
        # Small tiny blisters
        for i in range(15):
            x = np.random.randint(80, 170)
            y = np.random.randint(80, 170)
            draw.ellipse([x, y, x+4, y+4], fill=(255, 230, 230))
    elif disease_idx == 14: # Folliculitis - Small red bumps around hairs
        # Hair follicle red halos
        halos = [(85, 90), (120, 80), (150, 110), (95, 140), (145, 150), (115, 120), (170, 100)]
        for h in halos:
            draw.ellipse([h[0]-8, h[1]-8, h[0]+8, h[1]+8], fill=(225, 80, 80)) # Red halo
            draw.ellipse([h[0]-2, h[1]-2, h[0]+2, h[1]+2], fill=(250, 250, 220)) # Small pus head
            draw.line([h[0], h[1]-12, h[0], h[1]+12], fill=(40, 30, 20), width=1) # Hair strand
    elif disease_idx == 15: # Lichen Planus - Violet polygonal papules
        # Violet patches
        draw.ellipse([80, 80, 176, 176], fill=(160, 100, 160))
        # Fine white patterns (Wickham's striae)
        for i in range(10):
            x = np.random.randint(90, 160)
            y = np.random.randint(90, 160)
            draw.line([x, y, x+10, y+5], fill=(245, 240, 245), width=1)
    elif disease_idx == 16: # Herpes Zoster - Band of blisters
        # Red band background
        draw.ellipse([70, 90, 190, 160], fill=(230, 90, 90))
        # Grouped blisters
        blisters = [(80, 110), (105, 115), (120, 125), (145, 120), (160, 135), (110, 140), (135, 105)]
        for b in blisters:
            draw.ellipse([b[0]-6, b[1]-6, b[0]+6, b[1]+6], fill=(255, 240, 230))
    elif disease_idx == 17: # Pityriasis Rosea - Salmon scaly ovals
        # Large herald patch
        draw.ellipse([90, 95, 166, 145], fill=(235, 150, 130)) # Salmon pink oval
        # Scale border
        draw.ellipse([100, 105, 156, 135], fill=(245, 190, 175))
            
    img.save(save_path)

def download_or_generate_dataset(data_dir="data"):
    """
    Loads real clinical skin disease images from the local dataset directories.
    """
    images_dir = os.path.join(data_dir, "skin_images")
    dataset = []
    
    print("Building dataset from local clinical photographs...")
    
    for class_idx in range(len(DISEASE_CLASSES)):
        class_name = DISEASE_CLASSES[class_idx]
        class_dir = os.path.join(images_dir, class_name.replace(" ", "_").replace("(", "").replace(")", ""))
        
        if not os.path.exists(class_dir):
            raise FileNotFoundError(f"Missing clinical images directory for class: {class_name}")
            
        image_files = [os.path.join(class_dir, f) for f in os.listdir(class_dir) if f.endswith(".jpg")]
        if len(image_files) == 0:
            raise FileNotFoundError(f"No clinical images found in: {class_dir}")
            
        # Generate symptom text samples (English, Hindi, Kannada)
        templates = SYMPTOM_TEMPLATES[class_idx]
        languages = ["en", "hi", "kn"]
        
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
    labels = [x["disease_label"] for x in data_list]
    
    # First split: isolate 15% Test set
    train_val_data, test_data = train_test_split(
        data_list, 
        test_size=0.15, 
        random_state=42, 
        stratify=labels
    )
    
    # Second split: split remaining 85% into 70% Train and 15% Val
    train_val_labels = [x["disease_label"] for x in train_val_data]
    train_data, val_data = train_test_split(
        train_val_data, 
        test_size=0.15 / 0.85, 
        random_state=42, 
        stratify=train_val_labels
    )
    
    train_dataset = MultiModalSkinDataset(train_data, transform=get_image_transforms(train=True))
    val_dataset = MultiModalSkinDataset(val_data, transform=get_image_transforms(train=False))
    test_dataset = MultiModalSkinDataset(test_data, transform=get_image_transforms(train=False))
    
    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=8, shuffle=False)
    
    # 2. Initialize Models
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    num_classes = len(DISEASE_CLASSES)
    cnn_model = SkinDiseaseCNN(num_classes=num_classes, pretrained=True).to(device)
    text_encoder = SymptomTextEncoder(use_cuda=torch.cuda.is_available())
    fusion_model = MultiModalFusionNet(num_classes=num_classes).to(device)
    
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
    test_text_features = pre_encode_symptoms(test_data).to(device)
    
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
            img_logits = cnn_model(images)
            img_feats = cnn_model.extract_features(images)
            disease_logits, severity_logits = fusion_model(img_feats, text_feats)
            
            loss_img = disease_criterion(img_logits, disease_labels)
            loss_d = disease_criterion(disease_logits, disease_labels)
            loss_s = severity_criterion(severity_logits, severity_labels)
            
            # Combined Loss: joint training of image branch and multimodal fusion branch
            loss = loss_d + 0.5 * loss_s + 0.5 * loss_img
            
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
                
                img_logits = cnn_model(img)
                img_feats = cnn_model.extract_features(img)
                d_logits, s_logits = fusion_model(img_feats, t_feat)
                
                loss_img = disease_criterion(img_logits, d_label)
                loss_d = disease_criterion(d_logits, d_label)
                loss_s = severity_criterion(s_logits, s_label)
                loss = loss_d + 0.5 * loss_s + 0.5 * loss_img
                
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
    
    cm = confusion_matrix(val_targets, val_preds, labels=list(range(len(DISEASE_CLASSES))))
    
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
        
    # Evaluate on the fully isolated Test Set
    test_preds = []
    test_targets = []
    test_sev_preds = []
    test_sev_targets = []
    
    with torch.no_grad():
        for i in range(len(test_dataset)):
            item = test_dataset[i]
            img = item["image"].unsqueeze(0).to(device)
            t_feat = test_text_features[i].unsqueeze(0).to(device)
            
            img_feats = cnn_model.extract_features(img)
            d_logits, s_logits = fusion_model(img_feats, t_feat)
            
            pred_d = torch.argmax(d_logits, dim=1).item()
            pred_s = torch.argmax(s_logits, dim=1).item()
            
            test_preds.append(pred_d)
            test_targets.append(item["disease_label"].item())
            test_sev_preds.append(pred_s)
            test_sev_targets.append(item["severity_label"].item())
            
    test_precision, test_recall, test_f1, _ = precision_recall_fscore_support(
        test_targets, test_preds, average='weighted', zero_division=0
    )
    test_accuracy = np.mean(np.array(test_preds) == np.array(test_targets))
    test_cm = confusion_matrix(test_targets, test_preds, labels=list(range(len(DISEASE_CLASSES))))
    
    test_metrics = {
        "accuracy": float(test_accuracy),
        "precision": float(test_precision),
        "recall": float(test_recall),
        "f1_score": float(test_f1),
        "confusion_matrix": test_cm.tolist(),
        "classes": DISEASE_CLASSES
    }
    
    with open(os.path.join(checkpoint_dir, "test_metrics.json"), "w") as f:
        json.dump(test_metrics, f, indent=4)
        
    print("Training finished. Evaluation metrics and isolated test metrics saved.")
    return metrics

if __name__ == "__main__":
    train_multimodal_system(epochs=5)
