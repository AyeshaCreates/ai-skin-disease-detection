import os
import base64
import requests
import urllib.parse
from io import BytesIO
from PIL import Image

# Dictionary fallback for Hindi/Kannada/Tamil common symptoms to English
LOCAL_TRANSLATIONS = {
    # Hindi
    "काला अनियमित तिल जो आकार, रंग और रूप बदल रहा है। इसके किनारे असमान हैं।": 
        "A dark irregular mole that is changing size, color, and shape. It has asymmetric borders.",
    "मेरी बांह पर एक बढ़ता हुआ काला धब्बा है जिसके किनारे खुरदरे हैं और रंग असमान भूरा है।":
        "There is a growing dark spot on my arm with jagged edges and uneven brown color.",
    "मैंने अपनी पीठ पर एक तिल देखा जिसमें से खून बहने लगा है और इसके कई रंग हैं।":
        "I noticed a mole on my back that started bleeding and has multiple shades of black.",
    "मेरी टांग पर एक सममित भूरा तिल जो वर्षों से स्थिर है। इसकी सीमाएं चिकनी हैं।":
        "A symmetrical brown mole on my leg that has been stable for years. Smooth borders.",
    "मेरी त्वचा पर एक सामान्य सपाट भूरा धब्बा है, कोई खुजली या खून नहीं बह रहा है।":
        "I have a common flat brown spot on my skin, no itching, no bleeding.",
    "मेरे हाथ पर एक छोटा काला घेरा, पूरी तरह से दर्द रहित और सामान्य दिखने वाला।":
        "A small dark circle on my hand, completely painless and normal-looking.",
    "कोहनी के मोड़ों पर अत्यधिक खुजलीदार, लाल, सूजी हुई त्वचा का धब्बा। सूखा और पपड़ीदार।":
        "An extremely itchy, red, inflamed skin patch in the elbow creases. Dry and scaling.",
    "मेरी त्वचा बहुत लाल, सूखी, पपड़ीदार है और लगातार खुजली होती है। जलन महसूस हो रही है।":
        "My skin is very red, dry, flaky, and itches constantly. It feels irritated.",
    "गर्दन और चेहरे पर तीव्र खुजली और छिलने वाली त्वचा के साथ लाल धब्बे।":
        "Red patches with intense pruritus and peeling skin on the neck and face.",
    "छाती पर मोम जैसा, चिपका हुआ भूरा उभार जो छूने पर खुरदरे लगते हैं।":
        "A waxy, stuck-on brown growth on the chest that feels rough to the touch.",
    "मेरे सिर की त्वचा पर एक उभरा हुआ, पपड़ीदार भूरा धब्बा है, जो त्वचा पर चिपके मोम जैसा दिखता है।":
        "I have a raised, scaly brown plaque on my scalp, looks like candle wax stuck to the skin.",
    "मेरी पीठ पर हल्के भूरे रंग का मस्से जैसा उभार, कोई लक्षण नहीं हैं लेकिन खुरदरा लगता है।":
        "Benign-looking light brown wart-like growth on my back, no symptoms but feels bumpy.",
    "मेरे चेहरे और ठुड्डी पर लाल मुंहासे, मवाद वाले दाने और ब्लैकहेड्स निकल आए हैं।":
        "Breakout of red pimples, pustules, and blackheads on my face and chin.",
    "मेरे माथे और नाक पर दर्दनाक लाल उभार और बंद रोमछिद्र हैं।":
        "I have painful red bumps and clogged pores on my forehead and nose.",
    "गालों पर सूजन और छोटे व्हाइटहेड्स के साथ मुंहासे।":
        "Acne breakouts with inflammation and small whiteheads on my cheeks.",

    # Kannada
    "ಗಾತ್ರ, ಬಣ್ಣ ಮತ್ತು ಆಕಾರ ಬದಲಾಗುತ್ತಿರುವ ಕಪ್ಪಾದ ಅಸಮಪಾರ್ಶ್ವದ ಮಚ್ಚೆ. ಇದು ಅಸಮವಾದ ಅಂಚುಗಳನ್ನು ಹೊಂದಿದೆ.":
        "A dark irregular mole that is changing size, color, and shape. It has asymmetric borders.",
    "ನನ್ನ ಕೈಯ ಮೇಲೆ ಬೆಳೆಯುತ್ತಿರುವ ಕಪ್ಪು ಮಚ್ಚೆ ಇದ್ದು, ಅದರ ಅಂಚುಗಳು ಒರಟಾಗಿವೆ ಮತ್ತು ಬಣ್ಣ ಅಸಮವಾಗಿದೆ.":
        "There is a growing dark spot on my arm with jagged edges and uneven brown color.",
    "ನನ್ನ ಬೆನ್ನಿನ ಮೇಲಿರುವ ಮಚ್ಚೆಯಿಂದ ರಕ್ತ ಸೋರುತ್ತಿದ್ದು, ಇದು ಕಪ್ಪು ಬಣ್ಣದ विभिन्न ಛಾಯೆಗಳನ್ನು ಹೊಂದಿದೆ.":
        "I noticed a mole on my back that started bleeding and has multiple shades of black.",
    "ನನ್ನ ಕಾಲಿನ ಮೇಲೆ ವರ್ಷಗಳಿಂದ ಯಾವುದೇ ಬದಲಾವಣೆಯಿಲ್ಲದ ಸಮಪಾರ್ಶ್ವದ ಕಂದು ಮಚ್ಚೆ. ಮೃದುವಾದ ಅಂಚುಗಳು.":
        "A symmetrical brown mole on my leg that has been stable for years. Smooth borders.",
    "ನನ್ನ ಚರ್ಮದ ಮೇಲೆ ಸಾಮಾನ್ಯವಾದ ಚಪ್ಪಟೆ ಕಂದು ಮಚ್ಚೆ ಇದೆ, ಯಾವುದೇ ತುರಿಕೆ ಇಲ್ಲ, ರಕ್ತಸ್ರಾವವಿಲ್ಲ.":
        "I have a common flat brown spot on my skin, no itching, no bleeding.",
    "ನನ್ನ ಕೈ ಮೇಲೆ ಸಣ್ಣ ಕಪ್ಪು ವರ್ತುಲವಿದೆ, ಇದು ಯಾವುದೇ ನೋವಿಲ್ಲದೆ ಸಾಮಾನ್ಯವಾಗಿದೆ.":
        "A small dark circle on my hand, completely painless and normal-looking.",
    "ಮೊಣಕೈ ಮಡಿಕೆಗಳಲ್ಲಿ ತೀವ್ರ ತುರಿಕೆ ಉಂಟಾಗುವ ಕೆಂಪು, ಊದಿಕೊಂಡ ಚರ್ಮದ ಭಾಗ. ಒಣ ಮತ್ತು ಉದುರುತ್ತಿರುವ ಚರ್ಮ.":
        "An extremely itchy, red, inflamed skin patch in the elbow creases. Dry and scaling.",
    "ನನ್ನ ಚರ್ಮವು ತುಂಬಾ ಕೆಂಪಾಗಿದೆ, ಒಣಗಿದೆ ಮತ್ತು ಸತತವಾಗಿ ತುರಿಕೆ ಇರುತ್ತದೆ. ಉರಿತದ ಸಂವೇದನೆ ಇದೆ.":
        "My skin is very red, dry, flaky, and itches constantly. It feels irritated.",
    "ಕುತ್ತಿಗೆ ಮತ್ತು ಮುಖದ ಮೇಲೆ ತೀವ್ರ ತುರಿಕೆ ಮತ್ತು ಚರ್ಮ ಸುಲಿಯುವಿಕೆಯೊಂದಿಗೆ ಕೆಂಪು ದದ್ದುಗಳು.":
        "Red patches with intense pruritus and peeling skin on the neck and face.",
    "ಎದೆಯ ಮೇಲೆ ಮೇಣದಂತೆ ಅಂಟಿಕೊಂಡಿರುವ ಕಂದು ಬಣ್ಣದ ಬೆಳೆತ, ಸ್ಪರ್ಶಿಸಿದರೆ ಒರಟಾಗಿ ಭಾಸವಾಗುತ್ತದೆ.":
        "A waxy, stuck-on brown growth on the chest that feels rough to the touch.",
    "ನನ್ನ ನೆತ್ತಿಯ ಮೇಲೆ ಬೆಳೆದ ಕಂದು ಬಣ್ಣದ ಪೊರೆಯಿದೆ, ಇದು ಮೇಣ ಅಂಟಿಕೊಂಡಿರುವಂತೆ ಕಾಣುತ್ತದೆ.":
        "I have a raised, scaly brown plaque on my scalp, looks like candle wax stuck to the skin.",
    "ನನ್ನ ಬೆನ್ನಿನ ಮೇಲೆ ಸಣ್ಣ ಕಂದು ಬೆಳೆತವಿದೆ, ಯಾವುದೇ ತೊಂದರೆ ಇಲ್ಲ ಆದರೆ ಒರಟಾಗಿದೆ.":
        "Benign-looking light brown wart-like growth on my back, no symptoms but feels bumpy.",
    "ನನ್ನ ಮುಖ ಮತ್ತು ಗಲ್ಲದ ಮೇಲೆ ಕೆಂಪು ಮೊಡವೆಗಳು ಹಾಗೂ ಕಪ್ಪು ತಲೆಗಳು ಕಾಣಿಸಿಕೊಂಡಿವೆ.":
        "Breakout of red pimples, pustules, and blackheads on my face and chin.",
    "ನನ್ನ ಹಣೆ ಮತ್ತು ಮೂಗಿನ ಮೇಲೆ ನೋವಿನ ಕೆಂಪು ಗುಳ್ಳೆಗಳು ಮತ್ತು ಮುಚ್ಚಿಹೋದ ರೋಮಕೂಪಗಳಿವೆ.":
        "I have painful red bumps and clogged pores on my forehead and nose.",
    "ಕೆನ್ನೆಗಳ ಮೇಲೆ ಊತ ಮತ್ತು ಸಣ್ಣ ಬಿಳಿ ಮೊಡವೆಗಳೊಂದಿಗೆ ಮೊಡವೆಗಳ ಉಲ್ಬಣ.":
        "Acne breakouts with inflammation and small whiteheads on my cheeks.",

    # Tamil
    "அளவும் நிறமும் மாறும் ஒழுங்கற்ற கரும்புள்ளி. இதன் விளிம்புகள் சீரற்றவை.":
        "A dark irregular mole that is changing size, color, and shape. It has asymmetric borders.",
    "என் கையில் ஒரு கரும்புள்ளி வளர்கிறது, அதன் விளிம்புகள் சீரற்றவை.":
        "There is a growing dark spot on my arm with jagged edges and uneven brown color.",
    "என் முதுகில் ஒரு மச்சத்தில் இரத்தம் வடிகிறது, இது பல நிறங்களைக் கொண்டுள்ளது.":
        "I noticed a mole on my back that started bleeding and has multiple shades of black.",
    "என் காலில் பல வருடங்களாக மாறாத ஒரு சீரான பழுப்பு மச்சம். சீரான விளிம்புகள்.":
        "A symmetrical brown mole on my leg that has been stable for years. Smooth borders.",
    "என் தோலில் ஒரு சாதாரண பழுப்பு புள்ளி உள்ளது, அரிப்போ இரத்தப்போக்கோ இல்லை.":
        "I have a common flat brown spot on my skin, no itching, no bleeding.",
    "என் கையில் ஒரு சிறிய கரும்புள்ளி உள்ளது, இது வலி இல்லை மற்றும் சாதாரணமாக உள்ளது.":
        "A small dark circle on my hand, completely painless and normal-looking."
}

def translate_to(text: str, target_lang: str) -> str:
    """
    Translates English text to target Hindi (hi), Kannada (kn), or Tamil (ta) using public translation API.
    """
    if not text or not target_lang or target_lang == 'en':
        return text
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q={urllib.parse.quote(text)}"
        resp = requests.get(url, timeout=5, verify=False)
        if resp.status_code == 200:
            result = resp.json()
            translated_text = "".join([part[0] for part in result[0] if part[0]])
            return translated_text
    except Exception as e:
        print(f"Translation API error: {e}")
    return text

def translate_symptoms(text: str, source_lang: str) -> str:
    """
    Translates symptoms from Hindi (hi), Kannada (kn), or Tamil (ta) to English (en).
    """
    if not text or source_lang == 'en':
        return text

    clean_text = text.strip()
    
    # Check local dictionary mapping
    if clean_text in LOCAL_TRANSLATIONS:
        return LOCAL_TRANSLATIONS[clean_text]
        
    for local_phrase, translation in LOCAL_TRANSLATIONS.items():
        if clean_text in local_phrase or local_phrase in clean_text:
            return translation

    # Call translation API
    return translate_to(clean_text, 'en')

def pil_to_base64(img: Image.Image) -> str:
    """Converts PIL image to base64 string."""
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')
