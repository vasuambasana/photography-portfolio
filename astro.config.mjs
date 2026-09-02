import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import partytown from '@astrojs/partytown';

export default defineConfig({
  site: 'https://vasuambasana.com',
  output: 'static',
  redirects: {
    '/portfolio': '/gallery',
  },
  integrations: [
    tailwind(),
    react(),
    sitemap(),
    partytown({
      config: {
        forward: ['dataLayer.push', 'gtag', 'clarity'],
      },
    }),
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
