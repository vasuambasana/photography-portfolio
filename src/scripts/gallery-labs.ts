// Labs in the gallery: the data comes from /labs-data/gallery.json, fetched the first
// time something needs it and never on the stable site.

import type { EyePhoto } from '../utils/eye';

export interface GalleryPhoto extends Omit<EyePhoto, 'slug'> {
  title: string;
  src: string;
}

export interface GalleryLabsData {
  total: number;
  swatches: { key: string; name: string; hex: string }[];
  photos: Record<string, GalleryPhoto>;
}

let pending: Promise<GalleryLabsData> | null = null;

export function labsData(): Promise<GalleryLabsData> {
  pending ??= fetch('/labs-data/gallery.json').then((r) => {
    if (!r.ok) throw new Error(`Labs data: ${r.status}`);
    return r.json();
  });
  return pending;
}
