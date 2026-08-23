import os
import json
import numpy as np
import cv2
import onnxruntime as ort
from PIL import Image

IMAGE_SIZE = 224

class ONNKSkinDiseaseCNN:
    """
    ONNX Runtime wrapper for SkinDiseaseCNN.
    Loads and runs the CNN model offline without PyTorch.
    """
    def __init__(self, model_path, weights_path):
        self.session = ort.InferenceSession(model_path)
        
        # Load classifier weights and biases for Grad-CAM activation mapping
        with open(weights_path, "r") as f:
            weights_data = json.load(f)
        self.classifier_weight = np.array(weights_data["weight"], dtype=np.float32) # Shape: (18, 1280)
        self.classifier_bias = np.array(weights_data["bias"], dtype=np.float32)     # Shape: (18,)
        
    def preprocess(self, pil_img: Image.Image) -> np.ndarray:
        # Resize to 224x224
        img = pil_img.resize((IMAGE_SIZE, IMAGE_SIZE))
        np_img = np.array(img).astype(np.float32) / 255.0
        
        # Normalize
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        np_img = (np_img - mean) / std
        
        # Transpose from (H, W, C) to (C, H, W) and add batch dim (1, C, H, W)
        np_img = np.transpose(np_img, (2, 0, 1))
        np_img = np.expand_dims(np_img, axis=0)
        return np_img

    def run(self, pil_img: Image.Image):
        """Runs inference and returns logits and raw conv layer features."""
        input_tensor = self.preprocess(pil_img)
        logits, conv_out = self.session.run(None, {"image_input": input_tensor})
        return logits, conv_out

    def generate_cam_heatmap(self, conv_out: np.ndarray, target_class: int) -> np.ndarray:
        """
        Calculates CAM heatmap using intermediate conv features and linear layer weights.
        This is mathematically identical to Grad-CAM for this architecture.
        """
        # conv_out shape: (1, 1280, 7, 7) -> get (1280, 7, 7)
        features = conv_out[0]
        w = self.classifier_weight[target_class] # Shape: (1280,)
        
        # Linear combination of features
        heatmap = np.zeros((features.shape[1], features.shape[2]), dtype=np.float32)
        for k in range(1280):
            heatmap += w[k] * features[k]
            
        # ReLU activation mapping
        heatmap = np.maximum(heatmap, 0)
        
        # Normalize heatmap to [0, 1]
        max_val = np.max(heatmap)
        if max_val > 0:
            heatmap /= max_val
            
        return heatmap

def overlay_heatmap(original_img: Image.Image, heatmap: np.ndarray, alpha=0.5):
    """Applies the heatmap overlay to the original PIL image."""
    img = np.array(original_img.resize((IMAGE_SIZE, IMAGE_SIZE)))
    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    elif img.shape[2] == 4:
        img = img[:, :, :3]
        
    # Resize heatmap to 224x224
    heatmap_resized = cv2.resize(heatmap, (IMAGE_SIZE, IMAGE_SIZE))
    
    # Convert heatmap to pseudo-color jet map
    heatmap_color = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    
    # Overlay
    overlay = cv2.addWeighted(img, 1 - alpha, heatmap_color, alpha, 0)
    
    original_pil = Image.fromarray(img)
    heatmap_pil = Image.fromarray(heatmap_color)
    overlay_pil = Image.fromarray(overlay)
    
    return original_pil, heatmap_pil, overlay_pil

def validate_skin_image(image: Image.Image) -> dict:
    """Validates skin presence, brightness, blur, and abnormalities."""
    np_img = np.array(image.convert("RGB"))
    h, w, c = np_img.shape
    if h < 64 or w < 64:
        return {
            "valid": False,
            "reason": "quality",
            "message": "Image size too small. Please upload a higher resolution image."
        }
        
    ycrcb = cv2.cvtColor(np_img, cv2.COLOR_RGB2YCrCb)
    Cr = ycrcb[:, :, 1]
    Cb = ycrcb[:, :, 2]
    
    skin_mask = (Cr >= 133) & (Cr <= 173) & (Cb >= 77) & (Cb <= 127)
    skin_percentage = np.sum(skin_mask) / skin_mask.size
    
    if skin_percentage < 0.15:
        return {
            "valid": False,
            "reason": "unrelated",
            "message": "Invalid Image\nPlease upload a clear image of a suspected skin condition or skin lesion."
        }
        
    gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
    mean_brightness = np.mean(gray)
    if mean_brightness < 30.0 or mean_brightness > 240.0:
        return {
            "valid": False,
            "reason": "quality",
            "message": "Image Quality Too Low\nPlease upload a clear, well-lit image of the affected skin area."
        }
        
    blur_value = cv2.Laplacian(gray, cv2.CV_64F).var()
    if blur_value < 4.0:
        return {
            "valid": False,
            "reason": "quality",
            "message": "Image Quality Too Low\nPlease upload a clear, well-lit image of the affected skin area."
        }
        
    skin_gray = gray[skin_mask]
    if skin_gray.size > 0:
        std_val = np.std(skin_gray)
        if std_val < 5.0:
            return {
                "valid": False,
                "reason": "healthy",
                "message": "No Skin Abnormality Detected\nThe uploaded image does not appear to contain a visible skin condition. Please upload an image showing the affected area."
            }
        if std_val > 52.0:
            return {
                "valid": False,
                "reason": "unrelated",
                "message": "Invalid Image\nPlease upload a clear image of a suspected skin condition or skin lesion."
            }
            
    return {
        "valid": True,
        "reason": "ok",
        "message": "Image validated successfully."
    }
