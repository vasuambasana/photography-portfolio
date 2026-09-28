// Photos "develop" on screen: each image starts dark and soft and comes up to full
// exposure once it has loaded, over a duration taken from its own shutter speed (set at
// build time as --develop on the element; see utils/exposure.ts). The CSS only applies
// the undeveloped state when this script has run (html.js) and motion is allowed, so
// without JavaScript or with reduced motion, photos simply appear.
//
// A photo must never be left dark. The effect only plays for a photo that is ready
// almost at once; one still downloading after a moment (a large photo on a phone
// connection) is shown straight away and fills in as it loads, rather than sitting as
// a black box until the last byte arrives. Images added later (the lightbox island, the
// home hero) are picked up by an observer, and a safety net catches anything else.

const PATIENCE_MS = 250;
const SAFETY_MS = 4000;

function reveal(img: HTMLImageElement) {
  // Two frames, so the undeveloped state is painted first and the transition runs.
  requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('developed')));
}

function watch(img: HTMLImageElement) {
  if (img.classList.contains('developed') || img.dataset.developWatched) return;
  img.dataset.developWatched = '';
  if (img.complete && img.naturalWidth > 0) {
    reveal(img);
    return;
  }
  img.addEventListener('load', () => reveal(img), { once: true });
  img.addEventListener('error', () => img.classList.add('developed'), { once: true });
  setTimeout(() => {
    if (!img.complete) img.classList.add('developed', 'no-develop');
  }, PATIENCE_MS);
}

const pending = () => document.querySelectorAll<HTMLImageElement>('img[data-develop]:not(.developed)');

pending().forEach(watch);

new MutationObserver((records) => {
  for (const record of records) {
    record.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches('img[data-develop]')) watch(node as HTMLImageElement);
      node.querySelectorAll<HTMLImageElement>('img[data-develop]').forEach(watch);
    });
  }
}).observe(document.body, { childList: true, subtree: true });

// Safety net: anything loaded and still dark after a few seconds comes up regardless.
setInterval(() => {
  pending().forEach((img) => {
    if (img.complete && img.naturalWidth > 0) img.classList.add('developed');
  });
}, SAFETY_MS);
