import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://vasuambasana.com',
  output: 'static',
  integrations: [
    tailwind(),
    react(),
    // sitemap(), // temporarily disabled — version compatibility issue, will fix
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
