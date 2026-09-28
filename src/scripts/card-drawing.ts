// Labs: the settings card and the postcard, drawn on canvases in the visitor's browser.
//
// The photograph is always fitted whole, at its own shape, never cropped. The settings
// card is a screen object, so it takes the theme's colours. A postcard is paper, so it is
// white card and dark ink whatever the theme, the way "over a photograph" uses plain
// white and black.

import type { PhotoFacts } from './viewfinder';
import { postmarkDate, postmarkPlace, wrapWords } from '../utils/postcard';

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

// The photograph fitted whole inside a box, centred.
function fit(photo: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / photo.naturalWidth, h / photo.naturalHeight);
  const pw = Math.round(photo.naturalWidth * scale);
  const ph = Math.round(photo.naturalHeight * scale);
  return { x: x + Math.round((w - pw) / 2), y: y + Math.round((h - ph) / 2), w: pw, h: ph };
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

/** Postcards take the photograph's orientation: landscape 3:2, or portrait 2:3. */
export function postcardSize(photo: HTMLImageElement) {
  return photo.naturalWidth >= photo.naturalHeight ? { w: 1500, h: 1000 } : { w: 1000, h: 1500 };
}

/** The front: the photograph on white card, whole. */
export function drawPostcardFront(canvas: HTMLCanvasElement, photo: HTMLImageElement) {
  const { w, h } = postcardSize(photo);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  const r = fit(photo, 36, 36, w - 72, h - 72);
  ctx.drawImage(photo, r.x, r.y, r.w, r.h);
}

// A perforated stamp with the photograph in it, fitted whole on a dark mat.
function stamp(ctx: CanvasRenderingContext2D, photo: HTMLImageElement, x: number, y: number, w: number, h: number) {
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
  ctx.fillStyle = ink(0.9);
  ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  const r = fit(photo, x + inset, y + inset, w - inset * 2, h - inset * 2);
  ctx.drawImage(photo, r.x, r.y, r.w, r.h);
}

// A round postmark: the place round the top when one was recorded, the date across the
// middle, and the wavy cancellation lines trailing off to one side.
function postmark(ctx: CanvasRenderingContext2D, cx: number, cy: number, iso: string, place: string, wavesTo: number) {
  ctx.save();
  ctx.strokeStyle = ink(0.5);
  ctx.fillStyle = ink(0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 58, 0, Math.PI * 2);
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
    ctx.translate(cx + Math.cos(a) * 75, cy + Math.sin(a) * 75);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  // Cancellation waves.
  ctx.lineWidth = 3;
  ctx.strokeStyle = ink(0.35);
  const from = cx + (wavesTo < cx ? -100 : 100);
  for (let k = -1.5; k <= 1.5; k++) {
    ctx.beginPath();
    const y0 = cy + k * 18;
    const dir = wavesTo < cx ? -1 : 1;
    for (let t = 0; t <= Math.abs(wavesTo - from); t += 4) {
      const x = from + dir * t;
      const y = y0 + Math.sin(t / 14) * 6;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The back: the visitor's note on the left (or top), a stamp made of the photograph, a
 * postmark with its recorded date and place, lines for an address, and a small printed
 * caption saying what the photograph is.
 */
export function drawPostcardBack(canvas: HTMLCanvasElement, facts: PhotoFacts, message: string, photo: HTMLImageElement) {
  const { w, h } = postcardSize(photo);
  const landscape = w > h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = ink(0.45);
  ctx.font = mono(24);
  ctx.fillText('P O S T C A R D', 80, 116);

  const stampW = landscape ? 190 : 170;
  const stampH = landscape ? 230 : 205;
  const stampX = w - 80 - stampW;
  stamp(ctx, photo, stampX, 76, stampW, stampH);
  // The postmark overlaps the stamp's edge, as they do, but not the picture on it.
  postmark(ctx, stampX - 68, 76 + stampH - 40, facts.isoDate, postmarkPlace(facts.location), landscape ? stampX - 360 : 350);

  // Where the note goes, and where the address goes.
  const note = landscape ? { x: 80, y: 220, w: 740, bottom: h - 230 } : { x: 80, y: 400, w: 840, bottom: 880 };
  ctx.strokeStyle = ink(0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (landscape) {
    ctx.moveTo(900, 170);
    ctx.lineTo(900, h - 110);
  } else {
    ctx.moveTo(80, 940);
    ctx.lineTo(w - 80, 940);
  }
  ctx.stroke();
  const lines = landscape ? { x0: 960, x1: w - 80, ys: [560, 650, 740, 830] } : { x0: 80, x1: w - 80, ys: [1050, 1130, 1210, 1290] };
  ctx.strokeStyle = ink(0.25);
  for (const y of lines.ys) {
    ctx.beginPath();
    ctx.moveTo(lines.x0, y);
    ctx.lineTo(lines.x1, y);
    ctx.stroke();
  }

  // The note, in the visitor's words.
  ctx.fillStyle = ink(0.85);
  ctx.font = serif(46, 'italic');
  const lineHeight = 62;
  const maxLines = Math.floor((note.bottom - note.y) / lineHeight) + 1;
  wrapWords(message, note.w, (s) => ctx.measureText(s).width)
    .slice(0, maxLines)
    .forEach((text, i) => ctx.fillText(text, note.x, note.y + i * lineHeight));

  // The printed caption.
  const captionY = h - 150;
  ctx.fillStyle = ink(0.8);
  fitText(ctx, facts.title, (s) => serif(s), 30, landscape ? 780 : w - 160);
  ctx.fillText(facts.title, 80, captionY);
  ctx.fillStyle = ink(0.5);
  const line = settingsLine(facts) || facts.date;
  fitText(ctx, line, mono, 19, landscape ? 780 : w - 160);
  ctx.fillText(line, 80, captionY + 36);
  ctx.font = mono(19);
  ctx.fillText(`vasuambasana.com/photo/${facts.slug}`, 80, captionY + 68);
}

/** Both sides of a postcard, one above the other, for sharing as a single picture. */
export function stackFaces(front: HTMLCanvasElement, back: HTMLCanvasElement): HTMLCanvasElement {
  const gap = 48;
  const canvas = document.createElement('canvas');
  canvas.width = front.width + gap * 2;
  canvas.height = front.height + back.height + gap * 3;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = token('--color-surface-main');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(front, gap, gap);
  ctx.drawImage(back, gap, front.height + gap * 2);
  return canvas;
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.92)
  );
}
