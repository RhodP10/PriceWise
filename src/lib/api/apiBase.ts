/** Shared API origin. Set `PUBLIC_API_URL` or `VITE_API_URL` (full URL, no trailing slash). */
function envApiUrl(): string {
	const publicUrl =
		typeof import.meta.env?.PUBLIC_API_URL === 'string' ? import.meta.env.PUBLIC_API_URL.trim() : '';
	const viteUrl =
		typeof import.meta.env?.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL.trim() : '';
	return (publicUrl || viteUrl).replace(/\/+$/, '');
}

const envUrl = envApiUrl();

/**
 * In local `vite dev`, call same-origin `/api` so Vite proxies to FastAPI — no CORS.
 * On Vercel, set PUBLIC_API_URL or VITE_API_URL to the Render API origin at build time.
 */
export const API_BASE = envUrl !== '' ? envUrl : import.meta.env.DEV ? '/api' : '';
