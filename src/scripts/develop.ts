// Photos "develop" on screen: each image starts dark and soft and comes up to full
// exposure once it has loaded, over a duration taken from its own shutter speed (set at
// build time as --develop on the element; see utils/exposure.ts). The CSS only applies
// the undeveloped state when this script has run (html.js) and motion is allowed, so
// without JavaScript or with reduced motion, photos simply appear.
//
// A photo must never be left dark. Images added or replaced after load (the lightbox
// island re-rendering, the home hero) are picked up by an observer, and a safety net
// develops anything that has loaded but somehow missed its moment.

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
  } else {
    img.addEventListener('load', () => reveal(img), { once: true });
    img.addEventListener('error', () => img.classList.add('developed'), { once: true });
  }
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
