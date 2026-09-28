// Labs: journal entries you can play with. An entry places an empty
// <div data-widget="..."> in its markdown; with Labs off it stays empty and the entry
// reads exactly as written. Every number a widget shows is computed from the settings in
// the files (the #photo-previews data the entry already carries), never typed in.

import { labsOn } from './labs';
import { formatShutter, parseAperture, parseShutter, stopsBetween } from '../utils/exposure';

interface Frame {
  title: string;
  alt: string;
  large: string;
  width: number;
  height: number;
  day: string;
  specs: string;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
  ev: number | null;
}

const frames: Record<string, Frame> = (() => {
  try {
    return JSON.parse(document.getElementById('photo-previews')?.textContent ?? '{}');
  } catch {
    return {};
  }
})();

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function factor(stops: number): string {
  const x = 2 ** stops;
  if (x >= 1e6) return `${(x / 1e6).toFixed(1)} million`;
  if (x >= 1e4) return Math.round(x / 1000) * 1000 + '';
  return x >= 10 ? Math.round(x).toLocaleString('en-US') : x.toFixed(1);
}

// A slider from the brightest frame of a day to the darkest, stopping at every frame
// between, with the difference in light counted as you go.
function stopsSlider(el: HTMLElement) {
  const day = el.dataset.day;
  const list = Object.entries(frames)
    .filter(([, f]) => f.large && f.ev !== null && (!day || f.day === day))
    .map(([slug, f]) => ({ slug, ...f, ev: f.ev as number }))
    .sort((a, b) => b.ev - a.ev);
  if (list.length < 2) return;
  const top = list[0].ev;
  const span = top - list[list.length - 1].ev;

  el.className = 'journal-widget not-prose';
  el.innerHTML = `
    <p class="jw-label">Slide from the brightest frame of the day to the darkest</p>
    <figure class="jw-figure"><img alt="" /></figure>
    <p class="jw-caption"></p>
    <div class="jw-scale">
      <input type="range" min="0" max="${span.toFixed(1)}" step="0.1" value="0" aria-label="Stops of extra light" />
      <div class="jw-ticks">${list
        .map(
          (f) =>
            `<button type="button" style="left:${((top - f.ev) / span) * 100}%" data-stops="${(top - f.ev).toFixed(1)}" aria-label="${esc(f.title)}"></button>`
        )
        .join('')}</div>
    </div>
    <p class="jw-readout"></p>`;

  const img = el.querySelector('img')!;
  const input = el.querySelector('input')!;
  const caption = el.querySelector('.jw-caption')!;
  const readout = el.querySelector('.jw-readout')!;

  const update = () => {
    const stops = Number(input.value);
    const frame = list.reduce((a, b) => (Math.abs(top - b.ev - stops) < Math.abs(top - a.ev - stops) ? b : a));
    if (img.dataset.slug !== frame.slug) {
      img.dataset.slug = frame.slug;
      img.src = frame.large;
      img.alt = frame.alt;
      caption.innerHTML = `<a href="/photo/${frame.slug}">${esc(frame.title)}</a> · ${esc(frame.specs)}`;
    }
    readout.textContent =
      stops === 0 ? 'The brightest frame: the one that needed the least light.' : `${stops.toFixed(1)} stops more light: ×${factor(stops)}`;
  };
  input.addEventListener('input', update);
  el.querySelectorAll<HTMLButtonElement>('.jw-ticks button').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.dataset.stops ?? '0';
      update();
    })
  );
  update();
}

// The old rule for the moon: at f/11, a shutter speed of one over the ISO. Change the
// ISO and aperture and see what it asks for, and how the entry's frames compare.
function moonRule(el: HTMLElement) {
  const key = el.dataset.photo ?? '';
  const main = frames[key];
  const startIso = Number(main?.iso) || 100;
  const startN = parseAperture(main?.aperture ?? undefined) ?? 11;
  const ISOS = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1600];
  const APERTURES = [1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 4.9, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16];
  const rule = (iso: number, n: number) => (n / 11) ** 2 / iso;

  el.className = 'journal-widget not-prose';
  el.innerHTML = `
    <p class="jw-label">The moon rule: f/11 at one over the ISO</p>
    <div class="jw-controls">
      <label>ISO <select data-iso>${ISOS.map((i) => `<option ${i === startIso ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
      <label>Aperture <select data-n>${APERTURES.map((n) => `<option value="${n}" ${n === startN ? 'selected' : ''}>f/${n}</option>`).join('')}</select></label>
    </div>
    <p class="jw-answer"></p>
    <table class="jw-table"><thead><tr><th>Frame</th><th>The file</th><th>The rule</th><th>Difference</th></tr></thead><tbody></tbody></table>`;

  const iso = el.querySelector<HTMLSelectElement>('[data-iso]')!;
  const n = el.querySelector<HTMLSelectElement>('[data-n]')!;
  const answer = el.querySelector('.jw-answer')!;
  const update = () => {
    answer.innerHTML = `The rule asks for <strong>${formatShutter(rule(Number(iso.value), Number(n.value)))}</strong> at ISO ${iso.value} and f/${n.value}.`;
  };
  iso.addEventListener('change', update);
  n.addEventListener('change', update);
  update();

  // Every frame the entry names, against the rule at its own ISO and aperture.
  const rows = Object.entries(frames)
    .map(([slug, f]) => {
      const t = parseShutter(f.shutter ?? undefined);
      const N = parseAperture(f.aperture ?? undefined);
      const I = Number(f.iso);
      if (!t || !N || !(I > 0)) return '';
      const r = rule(I, N);
      const d = stopsBetween(t, r);
      const way = d < 0.5 ? 'as the rule says' : `${d.toFixed(1)} stops ${t > r ? 'more light' : 'less light'}`;
      return `<tr><td><a href="/photo/${slug}">${esc(f.title)}</a></td><td>${esc(f.shutter!)}</td><td>${formatShutter(r)}</td><td>${way}</td></tr>`;
    })
    .join('');
  el.querySelector('tbody')!.innerHTML = rows;
}

const WIDGETS: Record<string, (el: HTMLElement) => void> = {
  'stops-slider': stopsSlider,
  'moon-rule': moonRule,
};

if (labsOn()) {
  document.querySelectorAll<HTMLElement>('[data-widget]').forEach((el) => WIDGETS[el.dataset.widget ?? '']?.(el));
}
