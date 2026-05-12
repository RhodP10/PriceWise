/** Shared API origin; set `VITE_API_URL` in `.env` if the backend is not on localhost:8000. */
const envUrl = typeof import.meta.env?.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL.trim() : '';
export const API_BASE = envUrl || 'http://localhost:8000';
