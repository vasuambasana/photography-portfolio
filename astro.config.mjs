import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  integrations: [
    tailwind(),
    react(),
  ],
  image: {
    domains: [],
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
