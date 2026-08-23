import os
import torch
import torch.nn as nn
import numpy as np
import onnx
import onnxruntime as ort
import json
import sys

# Ensure backend package is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from backend.app.models.image_model import SkinDiseaseCNN
from backend.app.models.fusion_model import MultiModalFusionNet

CHECKPOINT_DIR = "backend/app/models/checkpoints"

class InferenceSkinDiseaseCNN(nn.Module):
    """
    Inference wrapper for SkinDiseaseCNN that outputs both the classification logits
    and the final convolutional layer activations (features before pooling).
    This allows calculating Grad-CAM heatmaps offline without PyTorch/autograd.
    """
    def __init__(self, base_cnn):
        super(InferenceSkinDiseaseCNN, self).__init__()
        self.features = base_cnn.features
        self.avgpool = base_cnn.avgpool
        self.classifier = base_cnn.classifier
        
    def forward(self, x):
        # Extract features from final conv layer before pooling
        conv_out = self.features(x)  # Shape: (batch_size, 1280, 7, 7)
        # Global average pool and flatten
        pooled = self.avgpool(conv_out)
        feats = torch.flatten(pooled, 1)  # Shape: (batch_size, 1280)
        # Classify
        logits = self.classifier(feats)  # Shape: (batch_size, 18)
        return logits, conv_out

def export_models():
    print("Loading PyTorch checkpoints...")
    cnn_path = os.path.join(CHECKPOINT_DIR, "cnn_model.pth")
    fusion_path = os.path.join(CHECKPOINT_DIR, "fusion_model.pth")
    
    # Initialize models
    base_cnn = SkinDiseaseCNN(num_classes=18, pretrained=False)
    fusion_model = MultiModalFusionNet(num_classes=18)
    
    # Load state dicts
    base_cnn.load_state_dict(torch.load(cnn_path, map_location="cpu"))
    fusion_model.load_state_dict(torch.load(fusion_path, map_location="cpu"))
    
    base_cnn.eval()
    fusion_model.eval()
    
    # Extract linear layer weights and biases for offline Grad-CAM
    linear_layer = base_cnn.classifier[1]  # nn.Linear in cnn_model.classifier
    weights_dict = {
        "weight": linear_layer.weight.data.numpy().tolist(),  # Shape: (18, 1280)
        "bias": linear_layer.bias.data.numpy().tolist()       # Shape: (18,)
    }
    weights_path = os.path.join(CHECKPOINT_DIR, "cnn_classifier_weights.json")
    with open(weights_path, "w") as f:
        json.dump(weights_dict, f)
    print(f"Extracted classifier weights and saved to {weights_path}")
    
    # Wrap base CNN for inference output
    inference_cnn = InferenceSkinDiseaseCNN(base_cnn)
    inference_cnn.eval()
    
    # 1. Export CNN model to ONNX
    print("Exporting InferenceSkinDiseaseCNN to ONNX...")
    dummy_img = torch.randn(1, 3, 224, 224)
    cnn_onnx_path = os.path.join(CHECKPOINT_DIR, "cnn_model.onnx")
    
    torch.onnx.export(
        inference_cnn,
        dummy_img,
        cnn_onnx_path,
        input_names=["image_input"],
        output_names=["logits", "conv_out"],
        dynamic_axes={
            "image_input": {0: "batch_size"},
            "logits": {0: "batch_size"},
            "conv_out": {0: "batch_size"}
        },
        opset_version=18
    )
    print(f"CNN model successfully exported to {cnn_onnx_path}")
    
    # 2. Export Fusion model to ONNX
    print("Exporting MultiModalFusionNet to ONNX...")
    dummy_img_feats = torch.randn(1, 1280)
    dummy_text_feats = torch.randn(1, 384)
    fusion_onnx_path = os.path.join(CHECKPOINT_DIR, "fusion_model.onnx")
    
    torch.onnx.export(
        fusion_model,
        (dummy_img_feats, dummy_text_feats),
        fusion_onnx_path,
        input_names=["img_features", "text_features"],
        output_names=["disease_logits", "severity_logits"],
        dynamic_axes={
            "img_features": {0: "batch_size"},
            "text_features": {0: "batch_size"},
            "disease_logits": {0: "batch_size"},
            "severity_logits": {0: "batch_size"}
        },
        opset_version=18
    )
    print(f"Fusion model successfully exported to {fusion_onnx_path}")
    
    # 3. Verify ONNX files using onnxruntime
    print("\nVerifying exported ONNX models via ONNX Runtime...")
    
    ort_cnn = ort.InferenceSession(cnn_onnx_path)
    cnn_out = ort_cnn.run(None, {"image_input": dummy_img.numpy()})
    print(f"ONNX CNN logits shape: {cnn_out[0].shape}, conv_out shape: {cnn_out[1].shape}")
    
    ort_fusion = ort.InferenceSession(fusion_onnx_path)
    fusion_out = ort_fusion.run(None, {
        "img_features": dummy_img_feats.numpy(),
        "text_features": dummy_text_feats.numpy()
    })
    print(f"ONNX Fusion disease shape: {fusion_out[0].shape}, severity shape: {fusion_out[1].shape}")
    
    print("\nONNX Conversion and verification completed successfully!")

if __name__ == "__main__":
    export_models()
