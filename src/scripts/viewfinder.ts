// Labs: see a photograph the way the camera's screen showed it, framing guides and the
// settings along the bottom. Every number is from the file; a setting the file didn't
// record is left off rather than filled in. The histogram and the spot meter (move the
// pointer over the picture) read the published file's own pixels.

import { contentRect } from './content-rect';
import { formatStops, histogramPath, lumaHistogram, stopsFromMiddleGrey } from '../utils/tones';

export interface PhotoFacts {
  slug: string;
  title: string;
  date: string;
  /** Capture date as YYYY-MM-DD. */
  isoDate: string;
  location: string | null;
  camera: string | null;
  focal: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
  ev: number | null;
  full: string;
  palette: { hex: string; weight: number }[];
  /** The photograph's own colour, dark enough to carry white type, or null. */
  accent: [number, number, number] | null;
}

export function readFacts(): PhotoFacts | null {
  try {
    return JSON.parse(document.getElementById('photo-facts')?.textContent ?? 'null');
  } catch {
    return null;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function build(facts: PhotoFacts): HTMLDivElement {
  const hud = document.createElement('div');
  hud.className = 'viewfinder';
  hud.setAttribute('aria-hidden', 'true');

  const readout = [
    facts.shutter?.replace(/s$/, ''),
    facts.aperture?.toUpperCase().replace('/', ''),
    facts.iso && `ISO ${facts.iso}`,
    facts.focal,
  ].filter(Boolean) as string[];

  hud.innerHTML = `
    <div class="vf-thirds"></div>
    <span class="vf-corner vf-tl"></span><span class="vf-corner vf-tr"></span>
    <span class="vf-corner vf-bl"></span><span class="vf-corner vf-br"></span>
    <span class="vf-focus"></span>
    <span class="vf-spot" hidden></span>
    <svg class="vf-histogram" viewBox="0 0 128 40" preserveAspectRatio="none"><path d=""></path></svg>
    <div class="vf-top">
      <span>${esc(facts.camera ?? '')}</span>
      <span>${esc(facts.date)}</span>
    </div>
    <div class="vf-bottom">
      ${
        readout.length
          ? readout.map((r) => `<span>${esc(r)}</span>`).join('')
          : '<span>No settings in this file</span>'
      }
      ${facts.ev !== null ? `<span class="vf-ev">EV ${facts.ev.toFixed(1)}</span>` : ''}
    </div>`;
  return hud;
}

// The picture's pixels, small: enough for a histogram and a spot reading.
function sample(img: HTMLImageElement) {
  const w = 160;
  const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

export function attachViewfinder(img: HTMLImageElement, facts: PhotoFacts, buttons: HTMLButtonElement[]) {
  const frame = img.closest<HTMLElement>('.photo-theatre');
  if (!frame) return;
  let hud: HTMLDivElement | null = null;
  let pixels: ReturnType<typeof sample> | null = null;

  const measure = () => {
    if (!hud || !img.complete || !img.naturalWidth) return;
    try {
      pixels ??= sample(img);
      hud.querySelector('.vf-histogram path')?.setAttribute('d', histogramPath(lumaHistogram(pixels.data, 64), 128, 40));
    } catch {
      // A canvas that can't be read (it always can here: same origin) just means no histogram.
    }
  };

  // Spot meter: the pointer is the spot. The focus square follows it and reads how far
  // that patch of the file sits from middle grey.
  const spot = (e: PointerEvent) => {
    if (!hud || !pixels || e.pointerType === 'touch') return;
    const r = contentRect(img);
    const focus = hud.querySelector<HTMLElement>('.vf-focus')!;
    const label = hud.querySelector<HTMLElement>('.vf-spot')!;
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) {
      focus.style.left = focus.style.top = '';
      label.hidden = true;
      return;
    }
    const px = Math.min(pixels.w - 1, Math.floor(((e.clientX - r.left) / r.width) * pixels.w));
    const py = Math.min(pixels.h - 1, Math.floor(((e.clientY - r.top) / r.height) * pixels.h));
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx;
        const y = py + dy;
        if (x < 0 || y < 0 || x >= pixels.w || y >= pixels.h) continue;
        const i = (y * pixels.w + x) * 4;
        sr += pixels.data[i];
        sg += pixels.data[i + 1];
        sb += pixels.data[i + 2];
        n++;
      }
    }
    const left = `${e.clientX - r.left}px`;
    const top = `${e.clientY - r.top}px`;
    focus.style.left = left;
    focus.style.top = top;
    label.style.left = left;
    label.style.top = top;
    label.textContent = `${formatStops(stopsFromMiddleGrey(sr / n, sg / n, sb / n))} EV`;
    label.hidden = false;
  };
  frame.addEventListener('pointermove', spot);
  frame.addEventListener('pointerleave', () => {
    if (!hud) return;
    const focus = hud.querySelector<HTMLElement>('.vf-focus')!;
    focus.style.left = focus.style.top = '';
    hud.querySelector<HTMLElement>('.vf-spot')!.hidden = true;
  });

  // Sits exactly over the picture, not the black frame around it.
  const fit = () => {
    if (!hud) return;
    const f = frame.getBoundingClientRect();
    const r = contentRect(img);
    Object.assign(hud.style, {
      left: `${r.left - f.left}px`,
      top: `${r.top - f.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
  };

  const set = (on: boolean) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(on)));
    if (on && !hud) {
      hud = build(facts);
      frame.append(hud);
      fit();
      if (img.complete) measure();
      else img.addEventListener('load', measure, { once: true });
      requestAnimationFrame(() => hud?.classList.add('vf-on'));
    } else if (!on && hud) {
      const old = hud;
      hud = null;
      old.classList.remove('vf-on');
      setTimeout(() => old.remove(), 250);
    }
  };

  const toggle = () => set(!hud);
  buttons.forEach((b) => b.addEventListener('click', toggle));
  addEventListener('resize', fit);
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('[aria-label^="Image viewer"], dialog[open]')) return;
    if (e.key === 'v' || e.key === 'V') toggle();
    if (e.key === 'Escape' && hud) set(false);
  });
}
