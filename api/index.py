import os
import sys

# Append project root to sys.path to ensure absolute imports resolve cleanly in Vercel Serverless environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from backend.app.onnx_main import app
