try:
    import torch
    from .image_model import SkinDiseaseCNN, GradCAM, overlay_heatmap, get_image_transforms
    from .text_model import SymptomTextEncoder
    from .fusion_model import MultiModalFusionNet
except ImportError:
    # Running in lightweight ONNX cloud environment without PyTorch
    pass
