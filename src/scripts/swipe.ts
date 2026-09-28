// Horizontal swipe on touch screens. One finger only; vertical scrolling and two-finger
// pinch-zoom stay with the browser (touch-action: pan-y pinch-zoom), so a swipe can never
// get in the way of reading or zooming. A swipe also swallows the click it would
// otherwise produce, so swiping across a photo does not open it.

interface SwipeHandlers {
  /** Finger moved right to left: usually "next". */
  left?: () => void;
  /** Finger moved left to right: usually "previous". */
  right?: () => void;
}

const THRESHOLD = 60;

export function onSwipe(el: HTMLElement, handlers: SwipeHandlers) {
  el.style.touchAction = 'pan-y pinch-zoom';

  let start: { x: number; y: number; id: number } | null = null;
  let swallowClick = false;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || start) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    swallowClick = false;
  });

  el.addEventListener('pointerup', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;

    if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swallowClick = true;
    (dx < 0 ? handlers.left : handlers.right)?.();
  });

  // The browser took over (a vertical scroll or a pinch): not a swipe.
  el.addEventListener('pointercancel', () => {
    start = null;
  });

  el.addEventListener(
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
