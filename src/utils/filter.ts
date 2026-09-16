/**
 * Gallery filter state lives entirely in the `?filter=` query param so that
 * photo pages, the filmstrip and the lightbox all agree on which set of photos
 * the visitor is currently browsing.
 *
 * Runs in the browser only — keep it free of Astro/node imports so React
 * islands and inline `<script>` tags can both use it.
 */

export const ALL_FILTER = 'all';

/** Reads the active filter, defaulting to `all` (e.g. when arriving from the home page). */
export function getActiveFilter(search: string = window.location.search): string {
  return new URLSearchParams(search).get('filter') || ALL_FILTER;
}

/** Returns `href` with the filter query param applied. Relative paths only. */
export function withFilter(href: string, filter: string): string {
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('filter', filter);
  return `${path}?${params}`;
}

export function matchesFilter(category: string | undefined, filter: string): boolean {
  return filter === ALL_FILTER || category === filter;
}
