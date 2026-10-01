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
      //base: process.argv.includes('dev') ? '' : '/dec_site'
      base: process.env.NODE_ENV === 'production' ? '/dec_site' : ''
    }
  }
};

export default config;
