// Labs: "Phone or camera?" (/play). A photograph from the archive; was it made on a phone
// or on a camera with a lens you can take off? The answer is the make its file records.
// Endless, in a shuffled order; the best run is remembered in this browser.

import { onSwipe } from './swipe';

export interface PhoneRound {
  slug: string;
  title: string;
  alt: string;
  src: string;
  width: number;
  height: number;
  camera: string;
  phone: boolean;
  settings: string;
}

const BEST = 'phone-best';

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function startPhoneGame(root: HTMLElement, rounds: PhoneRound[]) {
  if (rounds.length === 0) return;
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const img = q<HTMLImageElement>('[data-phone-img]');
  const figure = q<HTMLElement>('[data-phone-figure]');
  const verdict = q<HTMLElement>('[data-phone-verdict]');
  const reveal = q<HTMLElement>('[data-phone-reveal]');
  const title = q<HTMLAnchorElement>('[data-phone-title]');
  const settings = q<HTMLElement>('[data-phone-settings]');
  const score = q<HTMLElement>('[data-phone-score]');
  const answers = [...root.querySelectorAll<HTMLButtonElement>('[data-answer]')];
  const next = q<HTMLButtonElement>('[data-phone-next]');

  let order = shuffled(rounds);
  let at = 0;
  let streak = 0;
  let right = 0;
  let played = 0;
  let answered = false;
  let best = 0;
  try {
    best = Number(localStorage.getItem(BEST)) || 0;
  } catch {
    // Not remembered.
  }

  const current = () => order[at];

  const tally = () => {
    score.textContent = played
      ? `${right} of ${played} right · run of ${streak}${best ? ` · best ${best}` : ''}`
      : best
        ? `Best run so far: ${best}`
        : '';
  };

  function show() {
    const r = current();
    answered = false;
    img.src = r.src;
    img.width = r.width;
    img.height = r.height;
    img.alt = r.alt;
    verdict.hidden = true;
    reveal.hidden = true;
    answers.forEach((b) => {
      b.disabled = false;
      b.removeAttribute('data-picked');
    });
    // Warm the next one so the game never waits.
    const upcoming = order[(at + 1) % order.length];
    if (upcoming) new Image().src = upcoming.src;
  }

  function answer(guess: 'phone' | 'camera') {
    if (answered) return;
    answered = true;
    const r = current();
    const correct = (guess === 'phone') === r.phone;
    played++;
    if (correct) {
      right++;
      streak++;
    } else {
      streak = 0;
    }
    if (streak > best) {
      best = streak;
      try {
        localStorage.setItem(BEST, String(best));
      } catch {
        // Not remembered.
      }
    }
    answers.forEach((b) => {
      b.disabled = true;
      if (b.dataset.answer === guess) b.dataset.picked = correct ? 'right' : 'wrong';
    });
    verdict.textContent = correct ? `Right: ${r.phone ? 'a phone' : 'a camera'}` : `No: ${r.phone ? 'a phone' : 'a camera'}`;
    verdict.dataset.correct = String(correct);
    verdict.hidden = false;
    title.textContent = r.title;
    title.href = `/photo/${r.slug}`;
    settings.textContent = [r.camera, r.settings].filter(Boolean).join(' · ');
    reveal.hidden = false;
    tally();
    next.focus({ preventScroll: true });
  }

  function advance() {
    at++;
    if (at >= order.length) {
      order = shuffled(rounds);
      at = 0;
    }
    show();
  }

  answers.forEach((b) => b.addEventListener('click', () => answer(b.dataset.answer as 'phone' | 'camera')));
  next.addEventListener('click', advance);
  onSwipe(figure, {
    left: () => (answered ? advance() : answer('phone')),
    right: () => (answered ? advance() : answer('camera')),
  });
  addEventListener('keydown', (e) => {
    if (root.hidden || (e.target as HTMLElement).closest('input, textarea, select')) return;
    if (!answered && e.key === 'ArrowLeft') answer('phone');
    else if (!answered && e.key === 'ArrowRight') answer('camera');
    else if (answered && (e.key === 'ArrowRight' || e.key === 'n')) advance();
  });

  tally();
  show();
}
