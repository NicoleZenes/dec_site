import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-cloudflare';

export default defineConfig({
    plugins: [sveltekit({
        adapter: adapter(),
        alias: {
            '$lib': 'src/lib'
        }
    })]
});
