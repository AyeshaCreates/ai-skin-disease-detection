// API base URL configured via Vite environment variables for static hosting (Vercel)
// or falling back to local port 8000 when running in local development mode.
const getApiBase = () => {
  // If running inside Capacitor native Android container
  if (window.Capacitor || window.location.protocol === 'capacitor:') {
    return 'https://ai-skin-disease-detection-one.vercel.app';
  }
  // Automatically fallback to port 8000 for local runs
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  // Default to Render production backend URL (with VITE_API_BASE override)
  return import.meta.env.VITE_API_BASE || 'https://dermascan-ai.onrender.com';
};

export const API_BASE = getApiBase();
