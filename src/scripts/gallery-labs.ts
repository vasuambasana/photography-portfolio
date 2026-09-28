// Labs in the gallery: the data comes from /labs-data/gallery.json, fetched the first
// time something needs it and never on the stable site. The contact sheet's margins are
// built from it here, as text, not HTML.

import type { EyePhoto } from '../utils/eye';

export interface GalleryPhoto extends Omit<EyePhoto, 'slug'> {
  title: string;
  src: string;
  sheet: string;
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

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

/** The settings written in each frame's margin on the contact sheet, once. */
export async function addSheetMeta(cards: HTMLElement[]) {
  if (cards.every((c) => c.querySelector('.sheet-meta'))) return;
  const data = await labsData();
  for (const card of cards) {
    const info = data.photos[card.dataset.slug ?? ''];
    if (!info || card.querySelector('.sheet-meta')) continue;
    const meta = make('span', 'sheet-meta', info.sheet);
    meta.setAttribute('aria-hidden', 'true');
    card.append(meta);
  }
}
