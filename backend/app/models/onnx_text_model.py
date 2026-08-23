import numpy as np

EMBEDDING_DIM = 384

class SymptomTextEncoder:
    """
    Lightweight, offline-only Multilingual Sentence Encoder for Symptoms (supporting English, Hindi, Kannada).
    Fits perfectly in serverless functions by bypassing transformer downloads.
    """
    def __init__(self):
        # A comprehensive vocabulary of symptom keywords in English, Hindi, and Kannada
        self.vocab = {
            # English
            "itch": 0, "itchy": 0, "itching": 0, "scratch": 0, "irritation": 0, "pruritus": 0,
            "rash": 1, "rashes": 1, "redness": 1, "erythema": 1, "inflammation": 1, "burn": 1,
            "pain": 2, "painful": 2, "hurt": 2, "sore": 2, "tender": 2, "aching": 2,
            "dry": 3, "dryness": 3, "peeling": 3, "scaling": 3, "scab": 3, "flaky": 3,
            "lesion": 4, "spot": 4, "mole": 4, "bump": 4, "growth": 4, "patch": 4, "bleeding": 4,
            
            # Hindi
            "खुजली": 0, "खुजलीदार": 0, "चिपचिपा": 0, "चिड़चिड़ापन": 0,
            "चकत्ते": 1, "लाल": 1, "लालिमा": 1, "सूजन": 1, "जलन": 1,
            "दर्द": 2, "दुखना": 2, "तकलीफ": 2,
            "सूखा": 3, "रूखा": 3, "पपड़ी": 3, "छिलना": 3,
            "घाव": 4, "धब्बा": 4, "तिल": 4, "गांठ": 4, "खून": 4,
            
            # Kannada
            "ತುರಿಕೆ": 0, "ಕೆರೆತ": 0, "ಉರಿತ": 0,
            "ದದ್ದು": 1, "ದದ್ದುಗಳು": 1, "ಕೆಂಪು": 1, "ಊತ": 1,
            "ನೋವು": 2, "ನೋವಾಗುತ್ತಿದೆ": 2, "ಬೇನೆ": 2,
            "ಒಣ": 3, "ಒಣಗಿದ": 3, "ಪಕಳೆ": 3, "ಪೊರೆ": 3,
            "ಗಾಯ": 4, "ಮಚ್ಚೆ": 4, "ಹುಣ್ಣು": 4, "ರಕ್ತ": 4
        }
        self.vocab_size = 5
        
        # Set up a fixed projection matrix to EMBEDDING_DIM (384) for consistent shape
        np.random.seed(42)
        self.projection_matrix = np.random.normal(0.0, 1.0, (self.vocab_size, EMBEDDING_DIM)).astype(np.float32)
        
        # Normalize rows
        norms = np.linalg.norm(self.projection_matrix, axis=1, keepdims=True)
        self.projection_matrix /= (norms + 1e-8)

    def get_embeddings(self, text: str) -> np.ndarray:
        if not text:
            return np.zeros(EMBEDDING_DIM, dtype=np.float32)
            
        # Simple TF-IDF/BoW style projection
        tokens = text.lower().split()
        vector = np.zeros(self.vocab_size, dtype=np.float32)
        found = False
        for token in tokens:
            for keyword, idx in self.vocab.items():
                if keyword in token:
                    vector[idx] += 1.0
                    found = True
        
        # If no keywords found, use character n-grams or basic hash fallback
        if not found:
            for c in text:
                vector[ord(c) % self.vocab_size] += 1.0
                
        # Normalize vector
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector /= norm
            
        # Project to 384 dimensions
        embedding = np.dot(vector, self.projection_matrix)
        return embedding
