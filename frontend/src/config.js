// API base URL configured via Vite environment variables for static hosting (Vercel)
// or falling back to local port 8000 when running in local development mode.
const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  // Automatically fallback to port 8000 for local runs
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return window.location.origin;
};

export const API_BASE = getApiBase();
