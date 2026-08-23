import onnxruntime as ort
import numpy as np

class ONNXMultiModalFusionNet:
    """
    ONNX Runtime wrapper for MultiModalFusionNet.
    Fuses image features and symptom text features using ONNX Runtime.
    """
    def __init__(self, model_path):
        self.session = ort.InferenceSession(model_path)
        
    def forward(self, img_features: np.ndarray, text_features: np.ndarray):
        """
        Runs the multi-modal fusion forward pass.
        Args:
            img_features: NumPy array of shape (batch_size, 1280)
            text_features: NumPy array of shape (batch_size, 384)
        Returns:
            disease_logits: NumPy array of shape (batch_size, 18)
            severity_logits: NumPy array of shape (batch_size, 3)
        """
        # Run inference
        outputs = self.session.run(
            None, 
            {
                "img_features": img_features,
                "text_features": text_features
            }
        )
        return outputs[0], outputs[1]
