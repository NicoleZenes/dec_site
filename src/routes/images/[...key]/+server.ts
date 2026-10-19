import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const obj = await env.BUCKET.get(params.key);
	if (!obj) error(404, 'Not found');
	return new Response(obj.body, { headers: { 'content-type': 'image/png' } });
};