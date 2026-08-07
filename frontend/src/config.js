// API base URL configured via Vite environment variables for static hosting (Vercel)
// or falling back to window.location.origin for unified port serving
export const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;
