// The home page hero: the inline script beside the image has already picked a photograph
// for this visit (window.__hero). This steps through the rest of the same pool, never on
// its own, only when asked: the button, or a swipe on a touch screen. The new photograph
// cross-fades in once it has fully decoded, so there is never a half-loaded frame.
import { onSwipe } from './swipe';

interface HeroPhoto {
  slug: string;
  title: string;
  alt: string;
  location: string;
  srcset: string;
  src: string;
  night?: boolean;
}

type Pool = Record<'landscape' | 'portrait', HeroPhoto[]>;

const frame = document.getElementById('hero-frame');
const pool: Pool = JSON.parse(document.getElementById('hero-pool')?.textContent || '{}');
const state = (window as unknown as { __hero?: { orientation: keyof Pool; index: number; night?: boolean } }).__hero;

if (frame && state) {
  const list = pool[state.orientation].length ? pool[state.orientation] : pool.landscape;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A shuffled order that starts with the photograph already showing.
  // After dark (Labs), stepping stays among the night photographs.
  const rest = list
    .map((_, i) => i)
    .filter((i) => i !== state.index && (!state.night || list[i].night));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const order = [state.index, ...rest];
  let position = 0;
  let busy = false;

  const link = document.getElementById('hero-link') as HTMLAnchorElement;
  const where = document.getElementById('hero-where')!;

  const makeImage = (photo: HeroPhoto) => {
    const img = document.createElement('img');
    img.className = 'hero-img absolute inset-0 w-full h-full object-cover object-center scale-105';
    img.sizes = '100vw';
    img.decoding = 'async';
    img.alt = photo.alt;
    img.srcset = photo.srcset;
    img.src = photo.src;
    return img;
  };

  // Warm the next photograph once the page is idle, so the first step is instant.
  const preload = (step: number) => {
    const photo = list[order[(position + step + order.length) % order.length]];
    const warm = () => void makeImage(photo);
    'requestIdleCallback' in window ? requestIdleCallback(warm) : setTimeout(warm, 1500);
  };

  async function show(step: number) {
    if (busy || order.length < 2) return;
    busy = true;
    position = (position + step + order.length) % order.length;
    const photo = list[order[position]];

    const current = frame!.querySelector<HTMLImageElement>('img.hero-img:last-of-type');
    const next = makeImage(photo);
    next.style.opacity = '0';
    frame!.appendChild(next);
    try {
      await next.decode();
    } catch {
      // Decoding can reject for reasons that do not stop the image showing; carry on.
    }

    link.href = `/photo/${photo.slug}`;
    link.textContent = photo.title;
    where.textContent = photo.location ? `, ${photo.location}` : '';
    try {
      localStorage.setItem('hero-last', photo.slug);
    } catch {
      // Private mode: the next visit may repeat a photograph, nothing more.
    }

    const done = () => {
      current?.remove();
      busy = false;
      preload(step);
    };
    if (reduced) {
      next.style.opacity = '1';
      done();
      return;
    }
    next.style.transition = 'opacity 800ms cubic-bezier(0.3, 0.55, 0.3, 1)';
    requestAnimationFrame(() => requestAnimationFrame(() => (next.style.opacity = '1')));
    next.addEventListener('transitionend', done, { once: true });
  }

  document.getElementById('hero-next')?.addEventListener('click', () => show(1));
  const section = frame.closest('section');
  if (section) onSwipe(section, { left: () => show(1), right: () => show(-1) });

  // Labs: shake a phone for another photograph.
  if (document.documentElement.classList.contains('labs')) listenForShake(() => show(1));

  const first = frame.querySelector<HTMLImageElement>('#hero-img');
  if (first?.complete) preload(1);
  else first?.addEventListener('load', () => preload(1), { once: true });
}

// A shake is two hard jolts close together; walking with the phone in hand is not. iOS
// only reports motion after the visitor allows it, which has to be asked on a tap, so
// the first tap of the "another photograph" button asks.
function listenForShake(onShake: () => void) {
  if (!('DeviceMotionEvent' in window) || !matchMedia('(pointer: coarse)').matches) return;
  let jolts: number[] = [];
  let quietUntil = 0;

  const listen = () =>
    addEventListener('devicemotion', (e) => {
      const a = e.acceleration;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const now = performance.now();
      if (now < quietUntil || Math.hypot(a.x, a.y, a.z) < 14) return;
      jolts = [...jolts.filter((t) => now - t < 700), now];
      if (jolts.length >= 2) {
        jolts = [];
        quietUntil = now + 1200;
        onShake();
      }
    });

  const ask = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
  if (typeof ask !== 'function') {
    listen();
    return;
  }
  document.getElementById('hero-next')?.addEventListener(
    'click',
    () => {
      ask.call(DeviceMotionEvent)
        .then((answer) => answer === 'granted' && listen())
        .catch(() => undefined);
    },
    { once: true }
  );
}
