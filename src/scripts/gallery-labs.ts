// Labs in the gallery: the data comes from /labs-data/gallery.json, fetched the first
// time something needs it and never on the stable site. The backs of the cards and the
// contact sheet's margins are built from it here, as text, not HTML.

import type { EyePhoto } from '../utils/eye';

export interface GalleryPhoto extends Omit<EyePhoto, 'slug'> {
  title: string;
  src: string;
  date: string;
  location: string | null;
  settings: string;
  palette: string[];
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

// What would be pencilled on the back of a photograph. Only what the files record.
function back(info: GalleryPhoto, description: string): HTMLDivElement {
  const el = make('div', 'card-back');
  el.setAttribute('aria-hidden', 'true');

  const top = make('div', 'card-back-part');
  top.append(make('p', 'card-back-title', info.title), make('p', 'card-back-meta', info.date));
  if (info.location) top.append(make('p', 'card-back-meta', info.location));

  const bottom = make('div', 'card-back-part');
  if (info.camera) bottom.append(make('p', 'card-back-meta', info.camera));
  if (info.settings) bottom.append(make('p', 'card-back-meta', info.settings));
  if (!info.camera && !info.settings) bottom.append(make('p', 'card-back-meta', 'No settings in this file'));
  if (info.palette.length) {
    const dots = make('span', 'card-back-dots');
    for (const hex of info.palette) {
      const dot = document.createElement('span');
      dot.style.setProperty('--chip', hex);
      dots.append(dot);
    }
    bottom.append(dots);
  }

  el.append(top, make('p', 'card-back-note', description), bottom);
  return el;
}

/** Give every card its back, once. */
export async function addBacks(cards: HTMLElement[]) {
  if (cards.every((c) => c.querySelector('.card-back'))) return;
  const data = await labsData();
  for (const card of cards) {
    const info = data.photos[card.dataset.slug ?? ''];
    const link = card.querySelector('[data-photo-link]');
    if (!info || !link || link.querySelector('.card-back')) continue;
    link.append(back(info, card.querySelector('img')?.alt ?? ''));
  }
}

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
