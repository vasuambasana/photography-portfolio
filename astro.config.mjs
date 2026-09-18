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
    sitemap({
      // Pages that carry `noindex` must not also be advertised in the sitemap —
      // submitting a URL and then telling the crawler to drop it wastes budget
      // and reads as a conflicting signal.
      //
      // Tag pages go out wholesale: most are noindexed for thin content, and the
      // few that aren't are linked from /journal, so crawlers still reach them.
      // Listing only the indexable ones would mean recomputing entry counts here,
      // away from the template that makes the decision.
      filter: (page) =>
        !['/privacy/', '/accessibility/'].some((path) => page.endsWith(path)) &&
        !page.includes('/journal/tag/'),
      serialize: (item) => {
        const path = new URL(item.url).pathname;
        // A published photograph or entry never changes; the pages that list
        // them gain new ones. Hubs are what a crawler should come back to.
        const isLeaf = path.startsWith('/photo/') || /^\/journal\/[^/]+\/$/.test(path);
        const isHub = path === '/' || path === '/gallery/' || path === '/journal/';

        return {
          ...item,
          changefreq: isLeaf ? 'yearly' : 'monthly',
          priority: path === '/' ? 1.0 : isHub ? 0.9 : isLeaf ? 0.7 : 0.5,
        };
      },
    }),
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
