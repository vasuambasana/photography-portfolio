// Labs: the settings card and the postcard, drawn on canvases in the visitor's browser.
//
// The photograph is always shown whole, at its own shape, never cropped. The settings
// card is a screen object, so it takes the theme's colours. A postcard is paper: the
// front is the photograph edge to edge, the back is white card and dark ink whatever the
// theme, the way "over a photograph" uses plain white and black.

import type { PhotoFacts } from './viewfinder';
import { backLayout, postcardSize, postmarkDate, postmarkPlace, stampValue, wrapWords } from '../utils/postcard';

const token = (name: string) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;
const ink = (alpha: number) => `rgba(24, 24, 30, ${alpha})`;
const PAPER = 'white';
const serif = (px: number, style = '') => `${style} 500 ${px}px "Newsreader", Georgia, serif`.trim();
const mono = (px: number) => `400 ${px}px "JetBrains Mono", ui-monospace, monospace`;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function fontsReady() {
  await Promise.all([
    document.fonts.load(serif(56)),
    document.fonts.load(serif(46, 'italic')),
    document.fonts.load(mono(26)),
  ]).catch(() => undefined);
}

// Shrink a line of text until it fits the width.
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, max: number) {
  let size = px;
  ctx.font = font(size);
  while (size > 14 && ctx.measureText(text).width > max) {
    size -= 2;
    ctx.font = font(size);
  }
}

const settingsLine = (f: PhotoFacts) =>
  [f.camera, f.focal, f.aperture, f.shutter, f.iso && `ISO ${f.iso}`].filter(Boolean).join('  ·  ');

/**
 * The settings card: the photograph, then its title and exactly how it was made. The card
 * is as tall as the photograph needs, so a landscape frame doesn't sit in a band of
 * empty space.
 */
export function drawSettingsCard(facts: PhotoFacts, photo: HTMLImageElement): HTMLCanvasElement {
  const W = 1080;
  const M = 72;
  const scale = Math.min((W - M * 2) / photo.naturalWidth, 1080 / photo.naturalHeight);
  const pw = Math.round(photo.naturalWidth * scale);
  const ph = Math.round(photo.naturalHeight * scale);

  const titleY = M + ph + 96;
  const settingsY = titleY + 56;
  const whenY = settingsY + 44;
  const urlY = whenY + 72;
  const H = urlY + M - 8;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = token('--color-surface-main');
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(photo, Math.round((W - pw) / 2), M, pw, ph);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = token('--color-text-primary');
  fitText(ctx, facts.title, (s) => serif(s), 56, W - M * 2);
  ctx.fillText(facts.title, M, titleY);

  ctx.fillStyle = token('--color-text-secondary');
  const line = settingsLine(facts) || 'No settings in this file';
  fitText(ctx, line, mono, 26, W - M * 2);
  ctx.fillText(line, M, settingsY);

  const when = [facts.date, facts.location].filter(Boolean).join('  ·  ');
  fitText(ctx, when, mono, 24, W - M * 2);
  ctx.fillText(when, M, whenY);

  ctx.fillStyle = token('--color-text-accent');
  ctx.font = mono(22);
  ctx.fillText(`vasuambasana.com/photo/${facts.slug}`, M, urlY);
  return canvas;
}

const sizeOf = (photo: HTMLImageElement) => postcardSize(photo.naturalWidth, photo.naturalHeight);

/** The front: the whole photograph, edge to edge. The card is the photograph's shape. */
export function drawPostcardFront(canvas: HTMLCanvasElement, photo: HTMLImageElement) {
  const { w, h } = sizeOf(photo);
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(photo, 0, 0, w, h);
}

// A perforated stamp printed in the photograph's own colour: the VA mark, the year it was
// made, and for its value the shutter speed it was made at.
function stamp(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, facts: PhotoFacts) {
  const { x, y, w, h } = box;
  ctx.save();
  ctx.fillStyle = ink(0.06);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAPER;
  const step = 18;
  for (let i = x; i <= x + w; i += step) {
    ctx.beginPath();
    ctx.arc(i, y, 6, 0, Math.PI * 2);
    ctx.arc(i, y + h, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let j = y; j <= y + h; j += step) {
    ctx.beginPath();
    ctx.arc(x, j, 6, 0, Math.PI * 2);
    ctx.arc(x + w, j, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const inset = 16;
  const face = { x: x + inset, y: y + inset, w: w - inset * 2, h: h - inset * 2 };
  // The accent is already dark enough for white type on it (utils/palette.ts).
  ctx.fillStyle = facts.accent ? `rgb(${facts.accent.join(' ')})` : ink(0.9);
  ctx.fillRect(face.x, face.y, face.w, face.h);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = mono(19);
  const value = stampValue(facts.shutter);
  if (value) ctx.fillText(value, face.x + 12, face.y + 28);
  ctx.textAlign = 'center';
  ctx.font = serif(70);
  ctx.fillText('VA', face.x + face.w / 2, face.y + face.h / 2 + 26);
  ctx.font = mono(16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(facts.isoDate.slice(0, 4), face.x + face.w / 2, face.y + face.h - 14);
  ctx.restore();
}

// A round postmark: the place round the top when one was recorded, the date across the
// middle, and the wavy cancellation lines trailing off to one side.
function postmark(
  ctx: CanvasRenderingContext2D,
  mark: { cx: number; cy: number; r: number; wavesFrom: number; wavesTo: number },
  iso: string,
  place: string
) {
  const { cx, cy, r } = mark;
  ctx.save();
  ctx.strokeStyle = ink(0.5);
  ctx.fillStyle = ink(0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 34, 0, Math.PI * 2);
  ctx.stroke();

  // The date in two lines, the way postmarks set it, so it sits inside the inner ring.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const [day, month, year] = postmarkDate(iso).split(' ');
  ctx.font = mono(21);
  ctx.fillText(`${day ?? ''} ${month ?? ''}`.trim(), cx, cy - 12);
  ctx.fillText(year ?? '', cx, cy + 14);

  const ring = place || 'VASUAMBASANA.COM';
  ctx.font = mono(16);
  const spacing = 0.145; // radians per character
  const start = -Math.PI / 2 - ((ring.length - 1) * spacing) / 2;
  [...ring].forEach((ch, i) => {
    const a = start + i * spacing;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * (r - 17), cy + Math.sin(a) * (r - 17));
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  // Cancellation waves, trailing off to the left.
  ctx.lineWidth = 3;
  ctx.strokeStyle = ink(0.35);
  for (let k = -1.5; k <= 1.5; k++) {
    ctx.beginPath();
    const y0 = cy + k * 18;
    for (let x = mark.wavesFrom; x >= mark.wavesTo; x -= 4) {
      const y = y0 + Math.sin((mark.wavesFrom - x) / 14) * 6;
      if (x === mark.wavesFrom) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The back: the writing side. The visitor's note, a stamp, a postmark with the date the
 * photograph was made (and the place, when it was recorded), lines for an address, and a
 * small printed caption saying what is on the front.
 */
export function drawPostcardBack(canvas: HTMLCanvasElement, facts: PhotoFacts, message: string, photo: HTMLImageElement) {
  const { w, h } = sizeOf(photo);
  const l = backLayout(w, h);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = ink(0.45);
  ctx.font = mono(24);
  ctx.fillText('P O S T C A R D', l.heading.x, l.heading.y);

  stamp(ctx, l.stamp, facts);
  postmark(ctx, l.postmark, facts.isoDate, postmarkPlace(facts.location));

  ctx.strokeStyle = ink(0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(l.divider.x1, l.divider.y1);
  ctx.lineTo(l.divider.x2, l.divider.y2);
  ctx.stroke();
  ctx.strokeStyle = ink(0.25);
  for (const y of l.address.ys) {
    ctx.beginPath();
    ctx.moveTo(l.address.x1, y);
    ctx.lineTo(l.address.x2, y);
    ctx.stroke();
  }

  // The note, in the visitor's words.
  ctx.fillStyle = ink(0.85);
  ctx.font = serif(46, 'italic');
  const lineHeight = 62;
  const maxLines = Math.max(1, Math.floor((l.note.h - 46) / lineHeight) + 1);
  wrapWords(message, l.note.w, (t) => ctx.measureText(t).width)
    .slice(0, maxLines)
    .forEach((text, i) => ctx.fillText(text, l.note.x, l.note.y + 46 + i * lineHeight));

  // The printed caption.
  ctx.fillStyle = ink(0.8);
  fitText(ctx, facts.title, (px) => serif(px), 30, l.caption.w);
  ctx.fillText(facts.title, l.caption.x, l.caption.y);
  ctx.fillStyle = ink(0.5);
  const line = settingsLine(facts) || facts.date;
  fitText(ctx, line, mono, 19, l.caption.w);
  ctx.fillText(line, l.caption.x, l.caption.y + 36);
  const address = `vasuambasana.com/photo/${facts.slug}`;
  fitText(ctx, address, mono, 19, l.caption.w);
  ctx.fillText(address, l.caption.x, l.caption.y + 68);
}

/**
 * Both sides of a postcard in one picture, for sharing: front first, then back, one above
 * the other for a wide card and side by side for a tall one, so the picture never ends
 * up absurdly long.
 */
export function stackFaces(front: HTMLCanvasElement, back: HTMLCanvasElement): HTMLCanvasElement {
  const gap = 48;
  const sideBySide = front.height > front.width;
  const canvas = document.createElement('canvas');
  canvas.width = sideBySide ? front.width + back.width + gap * 3 : front.width + gap * 2;
  canvas.height = sideBySide ? front.height + gap * 2 : front.height + back.height + gap * 3;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = token('--color-surface-main');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(front, gap, gap);
  if (sideBySide) ctx.drawImage(back, front.width + gap * 2, gap);
  else ctx.drawImage(back, gap, front.height + gap * 2);
  return canvas;
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.92)
  );
}
