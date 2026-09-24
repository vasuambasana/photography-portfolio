// Journal entries name photographs in their prose. Hovering one of those links with a
// mouse, or focusing it from the keyboard, shows the photograph and its settings in a
// small card beside the link, so the reader can see what is being described without
// leaving the paragraph. Photos keep their own shape: a tall frame shows narrower on a
// neutral band rather than being cropped to fit. Touch devices get nothing: a tap just follows the link.

interface Preview {
  title: string;
  src: string;
  width: number;
  height: number;
  specs: string;
  date: string;
}

const data = document.getElementById('photo-previews');
const previews: Record<string, Preview> = data ? JSON.parse(data.textContent || '{}') : {};

const CARD_WIDTH = 288;
const GAP = 12;
const MARGIN = 16;

const card = document.createElement('div');
card.id = 'photo-preview';
card.setAttribute('role', 'tooltip');
card.className =
  'photo-preview fixed z-40 pointer-events-none bg-surface-card border border-subtle rounded-card shadow-lg overflow-hidden';
card.style.width = `${CARD_WIDTH}px`;
card.innerHTML = `
  <div class="bg-surface-overlay flex justify-center"><img alt="" class="block w-auto h-auto max-w-full max-h-[216px]" /></div>
  <div class="px-4 py-3">
    <p class="font-display text-body-md text-text-primary leading-snug" data-title></p>
    <p class="mt-1 text-[11px] font-mono tracking-[0.02em] text-text-secondary" data-meta></p>
  </div>`;

const img = card.querySelector('img')!;
const titleEl = card.querySelector<HTMLElement>('[data-title]')!;
const metaEl = card.querySelector<HTMLElement>('[data-meta]')!;
let current: HTMLAnchorElement | null = null;

function place(link: HTMLAnchorElement, pointerY?: number) {
  // A link can wrap across lines. Anchor to the line under the pointer, or the first.
  const rects = [...link.getClientRects()];
  const rect =
    (pointerY !== undefined && rects.find((r) => pointerY >= r.top && pointerY <= r.bottom)) || rects[0];
  if (!rect) return;

  const height = card.offsetHeight;
  const above = rect.top - GAP - height;
  const top = above >= MARGIN ? above : Math.min(rect.bottom + GAP, innerHeight - height - MARGIN);
  const left = Math.min(Math.max(rect.left + rect.width / 2 - CARD_WIDTH / 2, MARGIN), innerWidth - CARD_WIDTH - MARGIN);

  card.style.top = `${Math.round(top)}px`;
  card.style.left = `${Math.round(left)}px`;
  card.dataset.side = above >= MARGIN ? 'above' : 'below';
}

function show(link: HTMLAnchorElement, pointerY?: number) {
  const slug = new URL(link.href).pathname.split('/').filter(Boolean).pop() || '';
  const preview = previews[slug];
  if (!preview) return;

  current = link;
  img.src = preview.src;
  img.width = preview.width;
  img.height = preview.height;
  titleEl.textContent = preview.title;
  metaEl.textContent = [preview.specs, preview.date].filter(Boolean).join(' · ');

  if (!card.isConnected) document.body.appendChild(card);
  place(link, pointerY);
  link.setAttribute('aria-describedby', card.id);
  card.classList.add('is-open');
}

function hide() {
  current?.removeAttribute('aria-describedby');
  current = null;
  card.classList.remove('is-open');
}

document.querySelectorAll<HTMLAnchorElement>('.journal-body a[href^="/photo/"]').forEach((link) => {
  link.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') show(link, e.clientY);
  });
  link.addEventListener('pointerleave', hide);
  link.addEventListener('focus', () => show(link));
  link.addEventListener('blur', hide);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hide();
});
// The card is fixed to the viewport, so it follows its link while the page scrolls.
addEventListener('scroll', () => current && place(current), { passive: true });
