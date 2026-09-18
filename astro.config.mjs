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
    // These two shipped to production as "badlands" before the shoot was
    // identified as Death Valley. The slugs are corrected; the old URLs are
    // already indexed and linked, so they keep resolving.
    '/photo/above-the-badlands': '/photo/above-the-desert-ridge',
    '/photo/strata-of-the-badlands': '/photo/strata-at-first-light',
    // Retitled to break two duplicate titles. In both pairs the numbered slug
    // held the photograph the shared title fitted worst, so the unnumbered one
    // kept its name and its URL.
    '/photo/crimson-horizon-2': '/photo/amber-moon',
    '/photo/monolith-in-monochrome-2': '/photo/glass-among-the-brick',
  },
  integrations: [
    tailwind(),
    react(),
    sitemap({
      // Pages that carry `noindex` must not also be advertised in the sitemap.
      // Submitting a URL and then telling the crawler to drop it wastes budget
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
