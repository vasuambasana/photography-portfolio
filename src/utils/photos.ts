import type { CollectionEntry } from 'astro:content';

export type Photo = CollectionEntry<'photos'>;

/**
 * Canonical photo ordering: manually pinned photos first (ascending `order`),
 * then everything else newest-first. Slug breaks ties so builds are deterministic.
 */
export function sortPhotos(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    const ao = a.data.order;
    const bo = b.data.order;

    if (ao !== undefined && bo !== undefined && ao !== bo) return ao - bo;
    if (ao !== undefined && bo === undefined) return -1;
    if (ao === undefined && bo !== undefined) return 1;

    const byDate = b.data.date.getTime() - a.data.date.getTime();
    return byDate !== 0 ? byDate : a.slug.localeCompare(b.slug);
  });
}

export function photosInCategory(photos: Photo[], category: string): Photo[] {
  return photos.filter((p) => p.data.category === category);
}

/** Adjacent entries in an already-sorted list. */
export function neighbours<T extends { slug: string }>(list: T[], slug: string) {
  const i = list.findIndex((p) => p.slug === slug);
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
  };
}
