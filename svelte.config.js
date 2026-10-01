import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    prerender: {
      handleHttpError: 'warn'
    },
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html',
      precompress: false,
      strict: true
    }),
    paths: {
      // Tell SvelteKit to use the repo name as the base path in production
      base: process.argv.includes('dev') ? '' : '/dec-site'
    }
  }
};

export default config;
