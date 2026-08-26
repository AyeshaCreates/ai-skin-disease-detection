import os
import sys

# Switch between lightweight ONNX backend (Render/Production) and PyTorch backend (Local/Training)
if "RENDER" in os.environ or os.environ.get("USE_ONNX", "true").lower() == "true":
    from backend.app.onnx_main import app
else:
    try:
        from backend.app.pytorch_main import app
    except ImportError as e:
        print(f"Failed to load PyTorch backend, falling back to ONNX: {e}")
        from backend.app.onnx_main import app
