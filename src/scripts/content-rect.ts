// Where the picture actually is inside an <img> with object-fit: contain. The element's
// box can be wider or taller than the photograph it shows; tools that point at parts of
// the photograph need the picture's own rectangle.
export function contentRect(img: HTMLImageElement): DOMRect {
  const box = img.getBoundingClientRect();
  const w = img.naturalWidth || Number(img.getAttribute('width')) || box.width;
  const h = img.naturalHeight || Number(img.getAttribute('height')) || box.height;
  const scale = Math.min(box.width / w, box.height / h);
  const cw = w * scale;
  const ch = h * scale;
  return new DOMRect(box.left + (box.width - cw) / 2, box.top + (box.height - ch) / 2, cw, ch);
}
