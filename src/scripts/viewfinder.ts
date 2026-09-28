// Labs: see a photograph the way the camera's screen showed it, framing guides and the
// settings along the bottom. Every number is from the file; a setting the file didn't
// record is left off rather than filled in.

import { contentRect } from './content-rect';

export interface PhotoFacts {
  slug: string;
  title: string;
  date: string;
  location: string | null;
  camera: string | null;
  focal: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
  ev: number | null;
  full: string;
  palette: { hex: string; weight: number }[];
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

export function attachViewfinder(img: HTMLImageElement, facts: PhotoFacts, buttons: HTMLButtonElement[]) {
  const frame = img.closest<HTMLElement>('.photo-theatre');
  if (!frame) return;
  let hud: HTMLDivElement | null = null;

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
    if (document.querySelector('[aria-label^="Image viewer"]')) return;
    if (e.key === 'v' || e.key === 'V') toggle();
    if (e.key === 'Escape' && hud) set(false);
  });
}
