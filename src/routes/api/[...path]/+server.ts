import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

function backendOrigin(): string {
	const candidates = [env.BACKEND_URL, env.API_URL, publicEnv.PUBLIC_API_URL, env.VITE_API_URL];
	for (const raw of candidates) {
		const url = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
		if (/^https?:\/\//i.test(url) && !url.includes('.vercel.app')) {
			return url;
		}
	}
	if (dev) return 'http://127.0.0.1:8000';
	return '';
}

const handler: RequestHandler = async ({ params, request, url }) => {
	const origin = backendOrigin();
	if (!origin) {
		return new Response(
			JSON.stringify({
				detail:
					'Set BACKEND_URL on Vercel to your Render origin, e.g. https://your-api.onrender.com (no trailing slash).'
			}),
			{ status: 503, headers: { 'content-type': 'application/json' } }
		);
	}

	const rest = params.path ?? '';
	const target = `${origin}/${rest}${url.search}`;

	const headers = new Headers();
	const authorization = request.headers.get('authorization');
	if (authorization) headers.set('authorization', authorization);
	const contentType = request.headers.get('content-type');
	if (contentType) headers.set('content-type', contentType);
	const accept = request.headers.get('accept');
	if (accept) headers.set('accept', accept);

	const init: RequestInit = { method: request.method, headers };
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		init.body = await request.arrayBuffer();
	}

	let upstream: Response;
	try {
		upstream = await fetch(target, init);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Backend unreachable';
		return new Response(JSON.stringify({ detail: message }), {
			status: 502,
			headers: { 'content-type': 'application/json' }
		});
	}

	const out = new Headers();
	const upstreamType = upstream.headers.get('content-type');
	if (upstreamType) out.set('content-type', upstreamType);
	return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: out });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
