// Photos "develop" on screen: each image starts dark and soft and comes up to full
// exposure once it has loaded, over a duration taken from its own shutter speed (set at
// build time as --develop on the element; see utils/exposure.ts). The CSS only applies
// the undeveloped state when this script has run (html.js) and motion is allowed, so
// without JavaScript or with reduced motion, photos simply appear.

function reveal(img: HTMLImageElement) {
  // Two frames, so the undeveloped state is painted first and the transition runs.
  requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('developed')));
}

export function developAll(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLImageElement>('img[data-develop]:not(.developed)').forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      reveal(img);
    } else {
      img.addEventListener('load', () => reveal(img), { once: true });
      img.addEventListener('error', () => img.classList.add('developed'), { once: true });
    }
  });
}

developAll();
