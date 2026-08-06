import os
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
import cv2

# Define Image Preprocessing
IMAGE_SIZE = 224

def get_image_transforms(train=False):
    if train:
        return transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    else:
        return transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

class SkinDiseaseCNN(nn.Module):
    """
    EfficientNet-B0 based Skin Lesion Classifier.
    Can be used as a standalone image model or a feature extractor for multi-modal fusion.
    """
    def __init__(self, num_classes=5, pretrained=True):
        super(SkinDiseaseCNN, self).__init__()
        # Load weights safely depending on version
        if pretrained:
            weights = models.EfficientNet_B0_Weights.DEFAULT
            self.base_model = models.efficientnet_b0(weights=weights)
        else:
            self.base_model = models.efficientnet_b0()
            
        # EfficientNet-B0 output feature size before classification is 1280
        self.feature_dim = self.base_model.classifier[1].in_features
        
        # We extract features from the base model before the classifier
        self.features = self.base_model.features
        self.avgpool = self.base_model.avgpool
        
        # Standalone classification head
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(self.feature_dim, num_classes)
        )

    def extract_features(self, x):
        """Extracts the 1280-dimensional feature vector."""
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return x

    def forward(self, x):
        features = self.extract_features(x)
        logits = self.classifier(features)
        return logits


class GradCAM:
    """
    Grad-CAM implementation for PyTorch EfficientNetB0.
    """
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks
        self.forward_hook = target_layer.register_forward_hook(self.save_activation)
        self.backward_hook = target_layer.register_full_backward_hook(self.save_gradient)

    def save_activation(self, module, input, output):
        self.activations = output.detach()

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate_heatmap(self, input_tensor, target_class=None):
        self.model.eval()
        
        # Forward pass
        logits = self.model(input_tensor)
        
        if target_class is None:
            target_class = torch.argmax(logits, dim=1).item()
            
        # Backward pass
        self.model.zero_grad()
        one_hot = torch.zeros((1, logits.size(-1)), dtype=torch.float32, device=input_tensor.device)
        one_hot[0][target_class] = 1.0
        
        # Calculate gradients
        logits.backward(gradient=one_hot, retain_graph=True)
        
        if self.gradients is None or self.activations is None:
            # Fallback in case of registration issues
            return np.zeros((IMAGE_SIZE, IMAGE_SIZE), dtype=np.float32)
            
        # Pool the gradients across channels
        gradients = self.gradients.cpu().data.numpy()[0]
        activations = self.activations.cpu().data.numpy()[0]
        
        weights = np.mean(gradients, axis=(1, 2))
        
        # Compute weighted sum of activations
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]
            
        # Apply ReLU
        cam = np.maximum(cam, 0)
        
        # Normalize between 0 and 1
        if cam.max() > 0:
            cam = cam / cam.max()
            
        # Resize to original size (224x224)
        cam = cv2.resize(cam, (IMAGE_SIZE, IMAGE_SIZE))
        return cam

    def remove_hooks(self):
        self.forward_hook.remove()
        self.backward_hook.remove()


def overlay_heatmap(original_img: Image.Image, heatmap: np.ndarray, alpha=0.5):
    """
    Applies the heatmap overlay to the original PIL image.
    Returns: Original PIL image, Heatmap only, Overlay PIL image.
    """
    # Convert original PIL image to numpy array
    img = np.array(original_img.resize((IMAGE_SIZE, IMAGE_SIZE)))
    
    # Check if grayscale, convert to RGB
    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    elif img.shape[2] == 4:
        img = img[:, :, :3]  # Strip alpha if present
        
    # Convert heatmap to pseudo-color jet map
    heatmap_color = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    
    # Overlay heatmap on original image
    overlay = cv2.addWeighted(img, 1 - alpha, heatmap_color, alpha, 0)
    
    # Convert back to PIL
    original_pil = Image.fromarray(img)
    heatmap_pil = Image.fromarray(heatmap_color)
    overlay_pil = Image.fromarray(overlay)
    
    return original_pil, heatmap_pil, overlay_pil
