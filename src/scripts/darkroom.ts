// Labs, hidden: the darkroom. The page goes to safelight red and every photograph on it
// comes up again the way a print does in the tray, out of white paper, slowly. Enter by
// typing the old cheat code (up up down down left right left right B A) or holding the
// theme button; leave the same way, or with the button that appears. Lasts for this
// browser session.
//
// Only the page changes colour. The photographs finish exactly as they are.

import { labsOn } from './labs';

const KEY = 'darkroom';
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const root = document.documentElement;

function redevelop() {
  if (root.classList.contains('reduce-motion')) return;
  const imgs = document.querySelectorAll<HTMLImageElement>('img[data-develop].developed');
  imgs.forEach((img) => img.classList.remove('developed', 'no-develop'));
  requestAnimationFrame(() => requestAnimationFrame(() => imgs.forEach((img) => img.classList.add('developed'))));
}

function set(on: boolean) {
  root.classList.toggle('darkroom', on);
  try {
    if (on) sessionStorage.setItem(KEY, 'on');
    else sessionStorage.removeItem(KEY);
  } catch {
    // Lasts for this page only.
  }
  if (on) redevelop();
}

if (labsOn()) {
  let typed: string[] = [];
  addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
    typed = [...typed, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-CODE.length);
    if (typed.join() === CODE.join()) {
      typed = [];
      set(!root.classList.contains('darkroom'));
    }
  });

  // Hold the theme button. The click that follows a hold does not also switch the theme.
  document.querySelectorAll<HTMLButtonElement>('.theme-toggle-btn').forEach((button) => {
    let timer = 0;
    let held = false;
    button.addEventListener('pointerdown', () => {
      held = false;
      timer = window.setTimeout(() => {
        held = true;
        set(!root.classList.contains('darkroom'));
      }, 700);
    });
    const cancel = () => clearTimeout(timer);
    button.addEventListener('pointerup', cancel);
    button.addEventListener('pointerleave', cancel);
    button.addEventListener('pointercancel', cancel);
    button.addEventListener('contextmenu', (e) => e.preventDefault());
    button.addEventListener(
      'click',
      (e) => {
        if (!held) return;
        held = false;
        e.stopImmediatePropagation();
        e.preventDefault();
      },
      true
    );
  });

  document.querySelectorAll('[data-darkroom-leave]').forEach((b) => b.addEventListener('click', () => set(false)));
}
