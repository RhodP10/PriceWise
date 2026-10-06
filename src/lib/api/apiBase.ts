/**
 * Prefer an absolute Render URL when `PUBLIC_API_URL` / `VITE_API_URL` is set at build time.
 * Otherwise use same-origin `/api`, which Vite (dev) and Vercel (BACKEND_URL) proxy to FastAPI.
 * Never use the Vercel origin — that 404s `/auth/register` as a SvelteKit page.
 */
function envApiUrl(): string {
	const publicUrl =
		typeof import.meta.env?.PUBLIC_API_URL === 'string' ? import.meta.env.PUBLIC_API_URL.trim() : '';
	const viteUrl =
		typeof import.meta.env?.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL.trim() : '';
	const url = (publicUrl || viteUrl).replace(/\/+$/, '');
	if (/^https?:\/\//i.test(url) && !url.includes('.vercel.app')) {
		return url;
	}
	return '';
}

export const API_BASE = envApiUrl() || '/api';
