import os
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel
import numpy as np

# We'll use paraphrase-multilingual-MiniLM-L12-v2 for 384-dimensional multilingual embeddings
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIM = 384

class SymptomTextEncoder:
    """
    Multilingual Sentence Encoder for Symptoms (supporting English, Hindi, Kannada).
    Loads a MiniLM Transformer or falls back to a semantic vector mapping if offline.
    """
    def __init__(self, use_cuda=False):
        self.device = torch.device("cuda" if (use_cuda and torch.cuda.is_available()) else "cpu")
        self.tokenizer = None
        self.model = None
        self.fallback = False
        
        # Load HuggingFace model
        try:
            print(f"Loading transformer model: {MODEL_NAME} (may take a moment on first boot)...")
            # We set local_files_only=False, and catch any connection errors
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
            self.model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).to(self.device)
            print("Multilingual Transformer model loaded successfully.")
        except Exception as e:
            print(f"Warning: Failed to load Hugging Face model ({e}). Using robust offline fallback encoder.")
            self.fallback = True
            self._init_fallback_vocabulary()

    def _init_fallback_vocabulary(self):
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
        # Set up a fixed projection matrix to EMBD_DIM (384) for consistent shape
        np.random.seed(42)
        self.projection_matrix = np.random.normal(0.0, 1.0, (self.vocab_size, EMBEDDING_DIM)).astype(np.float32)
        # Normalize rows
        norms = np.linalg.norm(self.projection_matrix, axis=1, keepdims=True)
        self.projection_matrix /= (norms + 1e-8)

    def mean_pooling(self, model_output, attention_mask):
        token_embeddings = model_output[0] # First element of model_output contains all token embeddings
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

    def get_embeddings(self, text: str):
        """
        Generates a 384-dimensional feature vector for the given text.
        Works with English, Hindi, and Kannada.
        Returns: NumPy array of shape (384,)
        """
        if not text:
            return np.zeros(EMBEDDING_DIM, dtype=np.float32)
            
        if self.fallback:
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
            
        else:
            # Run Hugging Face model
            self.model.eval()
            with torch.no_grad():
                encoded_input = self.tokenizer(
                    [text], 
                    padding=True, 
                    truncation=True, 
                    max_length=128, 
                    return_tensors='pt'
                ).to(self.device)
                
                model_output = self.model(**encoded_input)
                sentence_embeddings = self.mean_pooling(model_output, encoded_input['attention_mask'])
                
                # Normalize embeddings
                sentence_embeddings = nn.functional.normalize(sentence_embeddings, p=2, dim=1)
                return sentence_embeddings.cpu().numpy()[0]
