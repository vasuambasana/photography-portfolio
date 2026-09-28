import { describe, expect, it } from 'vitest';
import { formatStops, histogramPath, lumaHistogram, stopsFromMiddleGrey } from './tones';

const rgba = (...pixels: [number, number, number][]) => Uint8ClampedArray.from(pixels.flatMap(([r, g, b]) => [r, g, b, 255]));

describe('lumaHistogram', () => {
  it('puts blacks on the left and whites on the right', () => {
    const hist = lumaHistogram(rgba([0, 0, 0], [0, 0, 0], [255, 255, 255]), 4);
    expect(hist).toEqual([1, 0, 0, 0.5]);
  });

  it('weighs green as brighter than blue, the way the eye does', () => {
    const [green] = [lumaHistogram(rgba([0, 255, 0]), 4).indexOf(1)];
    const [blue] = [lumaHistogram(rgba([0, 0, 255]), 4).indexOf(1)];
    expect(green).toBeGreaterThan(blue);
  });
});

describe('histogramPath', () => {
  it('closes a filled shape along the bottom of the box', () => {
    const d = histogramPath([0, 1], 100, 40);
    expect(d.startsWith('M0 40')).toBe(true);
    expect(d).toContain('L75.0 0.0');
    expect(d.endsWith('L100 40 Z')).toBe(true);
  });
});

describe('stopsFromMiddleGrey', () => {
  it('reads middle grey as zero, and white about two and a half stops over', () => {
    expect(stopsFromMiddleGrey(118, 118, 118)).toBeCloseTo(0, 1);
    expect(stopsFromMiddleGrey(255, 255, 255)).toBeCloseTo(2.47, 1);
  });

  it('clamps black instead of returning minus infinity', () => {
    expect(stopsFromMiddleGrey(0, 0, 0)).toBe(-10);
  });
});

describe('formatStops', () => {
  it('signs readings the way a meter does', () => {
    expect(formatStops(1.26)).toBe('+1.3');
    expect(formatStops(-2)).toBe('−2.0');
    expect(formatStops(0.04)).toBe('0.0');
  });
});
