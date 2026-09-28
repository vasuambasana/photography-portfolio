// Labs: "Your eye". After a visitor has opened a handful of photographs, the gallery can
// tell them what they have been drawn to (utils/eye.ts), and make a card of it to share.
// It is worked out in their browser from what their browser remembers (scripts/seen.ts).

import { eyeProfile, type Eye, type EyePhoto } from '../utils/eye';
import { wrapWords } from '../utils/postcard';

export const EYE_MINIMUM = 6;

export interface EyeData {
  total: number;
  swatches: { key: string; name: string; hex: string }[];
  photos: Record<string, Omit<EyePhoto, 'slug'> & { title: string; src: string }>;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const token = (name: string) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;

/** The profile as plain sentences, first person from the photographer's side. */
export function eyeLines(eye: Eye, data: EyeData): string[] {
  const lines: string[] = [];
  if (eye.afterDark) {
    const { n, of } = eye.afterDark;
    if (n / of >= 0.6) lines.push(`${n} of them were made after dark.`);
    else if (n / of <= 0.2) lines.push(`Almost all daylight: ${of - n} of ${of}.`);
    else lines.push(`${n} after dark, ${of - n} in daylight.`);
  }
  if (eye.focal) {
    const { median, lean } = eye.focal;
    lines.push(
      lean === 'long'
        ? `You lean long: the middle of your focal lengths is ${median}mm.`
        : lean === 'wide'
          ? `You like it wide: the middle of your focal lengths is ${median}mm.`
          : `Your focal lengths sit in the middle, around ${median}mm.`
    );
  }
  if (eye.subject?.categories.length === 1) {
    lines.push(`More ${eye.subject.categories[0]} than anything else (${eye.subject.n}).`);
  } else if (eye.subject?.categories.length === 2 && eye.subject.n > 1) {
    lines.push(`${cap(eye.subject.categories[0])} and ${eye.subject.categories[1]}, evenly: ${eye.subject.n} each.`);
  }
  if (eye.camera && eye.camera.n / eye.count >= 0.5) lines.push(`Mostly the ${eye.camera.name}.`);
  else if (eye.phones) lines.push(`${eye.phones.n} of ${eye.phones.of} were made on a phone.`);
  if (eye.years) lines.push(eye.years[0] === eye.years[1] ? `All from ${eye.years[0]}.` : `From ${eye.years[0]} to ${eye.years[1]}.`);
  const colours = eyeColours(eye, data);
  if (colours.length === 1) lines.push(`Your colour is ${colours[0].name}.`);
  else if (colours.length === 2) lines.push(`Your colours are ${colours[0].name} and ${colours[1].name}.`);
  return lines;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The visitor's colour, or the two tied for it; more than two tied says nothing. */
function eyeColours(eye: Eye, data: EyeData) {
  const keys = eye.colour?.keys ?? [];
  if (keys.length === 0 || keys.length > 2) return [];
  return keys.map((k) => data.swatches.find((s) => s.key === k)).filter((s): s is EyeData['swatches'][number] => Boolean(s));
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawEyeCard(eye: Eye, lines: string[], data: EyeData, recent: string[]): Promise<Blob> {
  await Promise.all([document.fonts.load('500 64px "Newsreader"'), document.fonts.load('400 24px "JetBrains Mono"')]).catch(
    () => undefined
  );
  const W = 1080;
  const H = 1350;
  const M = 80;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = token('--color-surface-main');
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = token('--color-text-secondary');
  ctx.font = '400 24px "JetBrains Mono", monospace';
  ctx.fillText('Y O U R   E Y E', M, M + 20);

  ctx.fillStyle = token('--color-text-primary');
  ctx.font = '500 60px "Newsreader", Georgia, serif';
  ctx.fillText(`You've opened ${eye.count} of my`, M, M + 110);
  ctx.fillText(`${data.total} photographs.`, M, M + 180);

  let y = M + 260;
  ctx.font = '400 34px "Newsreader", Georgia, serif';
  ctx.fillStyle = token('--color-text-secondary');
  for (const line of lines) {
    for (const part of wrapWords(line, W - M * 2, (t) => ctx.measureText(t).width)) {
      ctx.fillText(part, M, y);
      y += 48;
    }
    y += 6;
  }

  eyeColours(eye, data).forEach((c, i) => {
    ctx.fillStyle = c.hex;
    ctx.beginPath();
    ctx.arc(W - M - 40 - i * 60, M + 150, 40, 0, Math.PI * 2);
    ctx.fill();
  });

  // The last photographs they opened, each whole in its own cell.
  const images = (await Promise.all(recent.map((slug) => loadImage(data.photos[slug].src)))).filter(
    (i): i is HTMLImageElement => i !== null
  );
  const cols = 3;
  const gap = 12;
  const rows = Math.max(1, Math.ceil(images.length / cols));
  const top = y + 24;
  const room = H - M - 60 - top;
  const cell = Math.min((W - M * 2 - gap * (cols - 1)) / cols, (room - gap * (rows - 1)) / rows);
  images.forEach((img, i) => {
    const x = M + (i % cols) * (cell + gap);
    const cy = top + Math.floor(i / cols) * (cell + gap);
    ctx.fillStyle = 'black';
    ctx.fillRect(x, cy, cell, cell);
    const s = Math.min(cell / img.naturalWidth, cell / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, x + (cell - w) / 2, cy + (cell - h) / 2, w, h);
  });

  ctx.fillStyle = token('--color-text-accent');
  ctx.font = '400 24px "JetBrains Mono", monospace';
  ctx.fillText('vasuambasana.com', M, H - M + 10);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.92)
  );
}

let wired = false;
let file: File | null = null;

// The dialog's Share, Save and backdrop, set up once however many times it opens.
function wire(dialog: HTMLDialogElement) {
  if (wired) return;
  wired = true;
  dialog.querySelector('[data-eye-share]')!.addEventListener('click', async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: 'My eye', url: `${location.origin}/gallery` });
    } catch {
      // Dismissed.
    }
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

/** Not enough opened yet: say how many more, rather than a profile built on nothing. */
export function showEyeNotYet(dialog: HTMLDialogElement, opened: number) {
  wire(dialog);
  const more = EYE_MINIMUM - opened;
  dialog.querySelector('[data-eye-body]')!.innerHTML = `
    <p class="font-display text-display-md text-text-primary leading-tight">Open ${more} more ${more === 1 ? 'photograph' : 'photographs'} first.</p>
    <p class="mt-4 text-body-md text-text-secondary">After ${EYE_MINIMUM}, this shows what you have been drawn to: how many were made after dark, how long your lenses run, your colour.${opened ? ` You have opened ${opened} so far.` : ''}</p>`;
  dialog.querySelectorAll<HTMLElement>('[data-eye-only]').forEach((el) => (el.hidden = true));
  dialog.showModal();
}

/** The profile, and a card of it to share. */
export async function showYourEye(dialog: HTMLDialogElement, data: EyeData, seen: string[]) {
  wire(dialog);
  const known = seen.filter((slug) => data.photos[slug]);
  if (known.length < EYE_MINIMUM) {
    showEyeNotYet(dialog, known.length);
    return;
  }
  const eye = eyeProfile(known.map((slug) => ({ slug, ...data.photos[slug] })));
  const lines = eyeLines(eye, data);
  const recent = known.slice(-6).reverse();
  const chips = eyeColours(eye, data);

  dialog.querySelector('[data-eye-body]')!.innerHTML = `
    <p class="font-display text-display-md text-text-primary leading-tight">You've opened ${eye.count} of my ${data.total} photographs.</p>
    <ul class="mt-4 space-y-1.5 text-body-md text-text-secondary">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <span class="eye-colours" aria-hidden="true">${chips.map((c) => `<span style="--chip:${c.hex}"></span>`).join('')}</span>`;
  dialog.querySelector('[data-eye-photos]')!.innerHTML = recent
    .map(
      (slug) =>
        `<li><a href="/photo/${slug}" class="block no-underline" title="${esc(data.photos[slug].title)}"><img src="${data.photos[slug].src}" alt="" loading="lazy" class="w-full aspect-square object-contain bg-black rounded-md" /></a></li>`
    )
    .join('');
  dialog.querySelectorAll<HTMLElement>('[data-eye-only]').forEach((el) => (el.hidden = false));
  dialog.showModal();

  const save = dialog.querySelector<HTMLAnchorElement>('[data-eye-save]')!;
  const share = dialog.querySelector<HTMLButtonElement>('[data-eye-share]')!;
  const blob = await drawEyeCard(eye, lines, data, recent);
  file = new File([blob], 'my-eye.jpg', { type: 'image/jpeg' });
  URL.revokeObjectURL(save.href);
  save.href = URL.createObjectURL(blob);
  save.download = 'my-eye.jpg';
  save.hidden = false;
  share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
}
