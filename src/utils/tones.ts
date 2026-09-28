// Tones in a photograph's file, for the viewfinder's histogram and spot meter (Labs).
// These read the published JPEG's pixel values: they describe the photograph as it is on
// the page, not the light in the scene, and are labelled that way.

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Brightness of an sRGB pixel as the eye weighs it (Rec. 709), 0 to 255. */
export const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * A camera-style histogram of RGBA pixels: how many pixels sit at each brightness, from
 * black on the left to white on the right, scaled so the tallest column is 1.
 */
export function lumaHistogram(rgba: Uint8ClampedArray | Uint8Array, bins = 64): number[] {
  const counts = new Array<number>(bins).fill(0);
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const y = luma(rgba[i], rgba[i + 1], rgba[i + 2]);
    counts[Math.min(bins - 1, Math.floor((y / 256) * bins))]++;
  }
  const peak = Math.max(...counts, 1);
  return counts.map((c) => c / peak);
}

/** An SVG path that draws a histogram as a filled shape in a w x h box. */
export function histogramPath(hist: number[], w: number, h: number): string {
  if (hist.length === 0) return '';
  const step = w / hist.length;
  const points = hist.map((v, i) => `L${(i * step + step / 2).toFixed(1)} ${(h - v * h).toFixed(1)}`);
  return `M0 ${h} ${points.join(' ')} L${w} ${h} Z`;
}

/**
 * How many stops a patch of the file sits above or below middle grey (18% reflectance,
 * the tone a camera's meter aims for): 0 is middle grey, +1 twice as bright, -1 half.
 * Clamped at ten stops either way; pure black has no finite answer.
 */
export function stopsFromMiddleGrey(r: number, g: number, b: number): number {
  const y = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  if (y <= 0) return -10;
  return Math.max(-10, Math.min(10, Math.log2(y / 0.18)));
}

/** "+1.3", "−2.0", "0.0": a stop reading, with a real minus sign. */
export function formatStops(stops: number): string {
  const v = Math.round(stops * 10) / 10;
  if (v === 0) return '0.0';
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
}
