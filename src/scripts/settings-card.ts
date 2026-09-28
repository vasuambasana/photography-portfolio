// Labs: a card of the photograph and exactly how it was made, drawn on a canvas and
// handed to the phone's share sheet (or saved as a file where there isn't one).
//
// The photograph is fitted inside the card at its own shape, never cropped. Colours come
// from the theme tokens, so the card matches whichever theme the visitor is in.

import type { PhotoFacts } from './viewfinder';

const W = 1080;
const H = 1350;
const M = 72;

const token = (name: string, alpha = 1) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `rgb(${v} / ${alpha})`;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

export async function drawCard(facts: PhotoFacts): Promise<Blob> {
  await Promise.all([
    document.fonts.load('500 56px "Newsreader"'),
    document.fonts.load('400 26px "JetBrains Mono"'),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = token('--color-surface-main');
  ctx.fillRect(0, 0, W, H);

  // The photograph, whole, in the space above the text.
  const photo = await loadImage(facts.full);
  const boxW = W - M * 2;
  const boxH = H - M - 360;
  const scale = Math.min(boxW / photo.naturalWidth, boxH / photo.naturalHeight);
  const pw = Math.round(photo.naturalWidth * scale);
  const ph = Math.round(photo.naturalHeight * scale);
  const px = Math.round((W - pw) / 2);
  const py = M + Math.round((boxH - ph) / 2);
  ctx.drawImage(photo, px, py, pw, ph);

  // Its palette, as measured, in proportion.
  let x = px;
  const barY = py + ph + 18;
  for (const s of facts.palette) {
    const w = Math.round(s.weight * pw);
    ctx.fillStyle = s.hex;
    ctx.fillRect(x, barY, w, 10);
    x += w;
  }

  const textX = M;
  let y = M + boxH + 90;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = token('--color-text-primary');
  fitText(ctx, facts.title, (s) => `500 ${s}px "Newsreader", Georgia, serif`, 56, W - M * 2);
  ctx.fillText(facts.title, textX, y);

  const settings = [facts.camera, facts.focal, facts.aperture, facts.shutter, facts.iso && `ISO ${facts.iso}`]
    .filter(Boolean)
    .join('  ·  ');
  y += 58;
  ctx.fillStyle = token('--color-text-secondary');
  const mono = (s: number) => `400 ${s}px "JetBrains Mono", ui-monospace, monospace`;
  const line = settings || 'No settings in this file';
  fitText(ctx, line, mono, 26, W - M * 2);
  ctx.fillText(line, textX, y);

  y += 44;
  const when = [facts.date, facts.location].filter(Boolean).join('  ·  ');
  fitText(ctx, when, mono, 24, W - M * 2);
  ctx.fillText(when, textX, y);

  ctx.fillStyle = token('--color-text-accent');
  ctx.font = mono(22);
  ctx.fillText(`vasuambasana.com/photo/${facts.slug}`, textX, H - M + 8);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png')
  );
}

export function attachSettingsCard(facts: PhotoFacts, button: HTMLButtonElement, dialog: HTMLDialogElement) {
  const preview = dialog.querySelector<HTMLImageElement>('img')!;
  const save = dialog.querySelector<HTMLAnchorElement>('[data-card-save]')!;
  const share = dialog.querySelector<HTMLButtonElement>('[data-card-share]')!;
  let file: File | null = null;
  let url = '';

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const blob = await drawCard(facts);
      URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      file = new File([blob], `${facts.slug}.png`, { type: 'image/png' });
      preview.src = url;
      save.href = url;
      save.download = `${facts.slug}.png`;
      share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      dialog.showModal();
    } finally {
      button.disabled = false;
    }
  });

  share.addEventListener('click', async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: facts.title, url: `${location.origin}/photo/${facts.slug}` });
    } catch {
      // Dismissed: nothing to do.
    }
  });

  dialog.addEventListener('click', (e) => {
    // A click on the backdrop closes it.
    if (e.target === dialog) dialog.close();
  });
}
