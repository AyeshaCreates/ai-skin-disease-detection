# Model Documentation

This document describes the design, training pipeline, and execution details of the machine learning models.

---

## 1. Image Model: EfficientNetB0 (CNN)

We use **EfficientNetB0** as our visual feature extractor. EfficientNet utilizes a compound scaling method to scale network depth, width, and resolution uniformly, making it highly efficient yet powerful for medical image classification.

- **Architecture**: `torchvision.models.efficientnet_b0`
- **Pretrained Weights**: Loaded from ImageNet (`EfficientNet_B0_Weights.DEFAULT`) for transfer learning.
- **Visual Features**: Extracted from the pooling layer preceding the classification head, yielding a **1280-dimensional feature vector**.
- **Classifier Head**:
  ```python
  nn.Sequential(
      nn.Dropout(p=0.2, inplace=True),
      nn.Linear(1280, num_classes)
  )
  ```

### Explainable AI (Grad-CAM)
We implement **Gradient-weighted Class Activation Mapping (Grad-CAM)** to verify model predictions. Grad-CAM uses the gradients of any target class score flowing into the final convolutional layer of the CNN (`features[-1]`) to produce a coarse localization map highlighting the regions in the image most relevant to the prediction.

---

## 2. Text Model: Multilingual MiniLM (Transformer)

To process symptom descriptions in English, Hindi, and Kannada, we employ a multilingual Sentence Transformer.

- **Model**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Output Representation**: Dense sentence embeddings of **384 dimensions**.
- **Pooling Layer**: Mean pooling applied to token embeddings, normalized under L2 norm for cosine similarity consistency.
- **Offline Fallback Encoder**:
  To guarantee that the application can boot and run successfully in offline or firewalled sandboxes, we implement a backup vocabulary-based projection encoder. This maps symptom keywords (e.g. "खुजली", "ತುರಿಕೆ", "itch") to a fixed 384-dimensional space via an orthonormal random projection matrix.

---

## 3. Multi-Modal Fusion Network

The feature vectors are merged using a late-fusion neural network.

```
Visual Features (1280-dim)  ---\
                                 ===> Concatenation (1664-dim) ---> FC Layers ---> Predictions
Linguistic Features (384-dim)  ---/
```

- **Fused Dimension**: 1664
- **Fully Connected Layers**:
  - `Linear(1664, 512)` → `ReLU` → `BatchNorm1d` → `Dropout(0.4)`
  - `Linear(512, 128)` → `ReLU` → `BatchNorm1d` → `Dropout(0.3)`
  - Output Heads:
    - **Disease Classifier**: `Linear(128, 5)`
    - **Severity Classifier**: `Linear(128, 3)` (Mild, Moderate, Severe)

---

## 4. Dataset Preprocessing & Augmentation

The system downloads 256x256 image thumbnails from the public **ISIC Archive API** programmatically, balancing them across our target skin conditions. If offline, it automatically falls back to generating synthetic clinical lesions using randomized color distributions, textures, and borders to ensure the build never breaks.

### Visual Augmentation (Training Phase)
- Resized to `224x224` pixels.
- Random Horizontal and Vertical Flips.
- Random Rotations (up to 15 degrees).
- Color Jittering (brightness, contrast, and saturation adjustments).
- Normalized to ImageNet standards: mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`.

### Dataset Split
- **Train Set**: 80% (stratified by disease labels).
- **Validation Set**: 20% (used for early stopping).

---

## 5. Training and Evaluation

Training optimizes parameters using **AdamW** (learning rate `1e-3`, weight decay `1e-2`) and a joint loss function:
\[\text{Loss}_{\text{Total}} = \text{Loss}_{\text{Disease}} + 0.5 \times \text{Loss}_{\text{Severity}}\]

- **Early Stopping**: Monitored on validation loss with a patience of 5 epochs.
- **Checkpoints**: Saved to `backend/app/models/checkpoints/` (`cnn_model.pth` and `fusion_model.pth`).
- **Evaluation Metrics**: Computes accuracy, precision, recall, F1 score, and a confusion matrix, saved directly as `metrics.json` for UI visualization.
