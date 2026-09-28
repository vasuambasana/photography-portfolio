// Labs: press and hold a photograph to look at it under a loupe.
//
// A plain click (or tap) still opens the lightbox; a swipe still steps to the next
// photograph. Only a press held still for a moment becomes the loupe, and once it has,
// the finger can move freely without scrolling the page. Letting go puts it away and
// swallows the click that would otherwise follow.

import { contentRect } from './content-rect';

const HOLD_MS = { mouse: 260, touch: 380, pen: 300 } as Record<string, number>;
const SLOP = 10;
const SIZE = 184;

let engagedUntil = 0;
let active = false;

/** True while the loupe is out, and for a moment after, so other gestures stand down. */
export const loupeEngaged = () => active || performance.now() < engagedUntil;

export function attachLoupe(img: HTMLImageElement, fullSrc: string) {
  let timer = 0;
  let start: { x: number; y: number; id: number; type: string } | null = null;
  let lens: HTMLDivElement | null = null;
  let swallowClick = false;

  img.style.setProperty('-webkit-touch-callout', 'none');
  img.style.userSelect = 'none';
  img.draggable = false;

  const place = (x: number, y: number, touch: boolean) => {
    if (!lens) return;
    const r = contentRect(img);
    // Same zoom for every screen: at least 2.5x, more on a small screen, never past
    // the resolution of the file.
    const zoom = Math.min(4, Math.max(2.5, 1800 / r.width));
    const px = Math.min(Math.max(x - r.left, 0), r.width);
    const py = Math.min(Math.max(y - r.top, 0), r.height);
    lens.style.backgroundSize = `${r.width * zoom}px ${r.height * zoom}px`;
    lens.style.backgroundPosition = `${SIZE / 2 - px * zoom}px ${SIZE / 2 - py * zoom}px`;
    // Above a finger so it isn't hidden under it; centred on a mouse pointer.
    const lift = touch ? SIZE * 0.75 : 0;
    lens.style.transform = `translate(${x - SIZE / 2}px, ${y - SIZE / 2 - lift}px)`;
  };

  const open = (x: number, y: number, touch: boolean) => {
    active = true;
    lens = document.createElement('div');
    lens.className = 'loupe';
    lens.setAttribute('aria-hidden', 'true');
    lens.style.width = lens.style.height = `${SIZE}px`;
    lens.style.backgroundImage = `url("${fullSrc}")`;
    document.body.append(lens);
    place(x, y, touch);
    requestAnimationFrame(() => lens?.classList.add('loupe-open'));
  };

  const close = () => {
    clearTimeout(timer);
    start = null;
    if (!active) return;
    active = false;
    swallowClick = true;
    engagedUntil = performance.now() + 400;
    const old = lens;
    lens = null;
    old?.classList.remove('loupe-open');
    setTimeout(() => old?.remove(), 200);
  };

  img.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || start) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType };
    swallowClick = false;
    timer = window.setTimeout(() => {
      if (start) open(start.x, start.y, start.type === 'touch');
    }, HOLD_MS[e.pointerType] ?? 300);
  });

  addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    if (active) {
      place(e.clientX, e.clientY, start.type === 'touch');
    } else if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP) {
      // Moved before the hold landed: a scroll, a swipe or a drag, not a loupe.
      clearTimeout(timer);
      start = null;
    }
  });

  addEventListener('pointerup', (e) => {
    if (start && e.pointerId === start.id) close();
  });
  addEventListener('pointercancel', (e) => {
    if (start && e.pointerId === start.id) close();
  });
  addEventListener('blur', close);

  // Once the loupe is out the finger belongs to it: no scrolling underneath.
  img.addEventListener(
    'touchmove',
    (e) => {
      if (active && e.cancelable) e.preventDefault();
    },
    { passive: false }
  );

  // A long press on a phone would otherwise bring up "save image".
  img.addEventListener('contextmenu', (e) => {
    if (start || active) e.preventDefault();
  });

  // The click after a loupe is not a click. Captured on the frame, so it never reaches
  // the lightbox.
  (img.closest('.photo-theatre') ?? img.parentElement)?.addEventListener(
    'click',
    (e) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
}
