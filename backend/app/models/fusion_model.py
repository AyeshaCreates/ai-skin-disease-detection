import torch
import torch.nn as nn
import torch.nn.functional as F

class MultiModalFusionNet(nn.Module):
    """
    Fuses feature vectors from:
    1. EfficientNetB0 Image Features (1280 dimensions)
    2. MiniLM/Multilingual Text Embeddings (384 dimensions)
    Total fused dimension = 1664
    """
    def __init__(self, num_classes=5, image_dim=1280, text_dim=384):
        super(MultiModalFusionNet, self).__init__()
        self.image_dim = image_dim
        self.text_dim = text_dim
        self.fused_dim = image_dim + text_dim
        
        # Joint representation fully connected layers
        self.fc1 = nn.Linear(self.fused_dim, 512)
        self.bn1 = nn.BatchNorm1d(512)
        self.dropout1 = nn.Dropout(0.4)
        
        self.fc2 = nn.Linear(512, 128)
        self.bn2 = nn.BatchNorm1d(128)
        self.dropout2 = nn.Dropout(0.3)
        
        self.classifier = nn.Linear(128, num_classes)
        
        # Severity classifier head (Mild, Moderate, Severe)
        # Often, severity is correlated with the specific disease type + symptom severity
        self.severity_classifier = nn.Linear(128, 3) # 3 classes: 0=Mild, 1=Moderate, 2=Severe

    def forward(self, image_features, text_features):
        """
        Args:
            image_features: Tensor of shape (batch_size, 1280)
            text_features: Tensor of shape (batch_size, 384)
        Returns:
            disease_logits: Tensor of shape (batch_size, num_classes)
            severity_logits: Tensor of shape (batch_size, 3)
        """
        # Ensure correct batch shapes
        if len(image_features.shape) == 1:
            image_features = image_features.unsqueeze(0)
        if len(text_features.shape) == 1:
            text_features = text_features.unsqueeze(0)
            
        # Concatenate features along dimension 1 (features)
        fused = torch.cat((image_features, text_features), dim=1)
        
        x = self.fc1(fused)
        if x.size(0) > 1: # Batch Norm requires batch size > 1
            x = self.bn1(x)
        x = F.relu(x)
        x = self.dropout1(x)
        
        x = self.fc2(x)
        if x.size(0) > 1:
            x = self.bn2(x)
        x = F.relu(x)
        x = self.dropout2(x)
        
        disease_logits = self.classifier(x)
        severity_logits = self.severity_classifier(x)
        
        return disease_logits, severity_logits
