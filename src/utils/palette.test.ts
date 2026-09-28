import { describe, expect, it } from 'vitest';
import {
  archiveSwatches,
  colourRhyme,
  deltaE,
  labToHex,
  paletteDistance,
  paletteFromPixels,
  rgbToLab,
  type Paletted,
} from './palette';

// A flat image: n pixels of one colour.
const flat = (n: number, r: number, g: number, b: number) => Array.from({ length: n }, () => [r, g, b]).flat();
const pixels = (...parts: number[][]) => Uint8Array.from(parts.flat());

describe('Lab conversion', () => {
  it('maps white, black and a mid grey to the right lightness', () => {
    expect(rgbToLab(255, 255, 255)[0]).toBeCloseTo(100, 1);
    expect(rgbToLab(0, 0, 0)[0]).toBeCloseTo(0, 1);
    expect(rgbToLab(119, 119, 119)[0]).toBeCloseTo(50, 0);
  });

  it('round-trips through hex', () => {
    for (const hex of ['#ff0000', '#1d3557', '#e9c46a', '#777777']) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(labToHex(rgbToLab(r, g, b))).toBe(hex);
    }
  });

  it('sees two near-identical blues as close and blue against orange as far', () => {
    const blue = rgbToLab(30, 60, 140);
    expect(deltaE(blue, rgbToLab(32, 62, 142))).toBeLessThan(2);
    expect(deltaE(blue, rgbToLab(230, 130, 40))).toBeGreaterThan(60);
  });
});

describe('paletteFromPixels', () => {
  it('finds the colours and their shares', () => {
    const palette = paletteFromPixels(pixels(flat(75, 20, 40, 120), flat(25, 240, 150, 30)), 3);
    expect(palette).toHaveLength(2);
    expect(palette[0].weight).toBeCloseTo(0.75);
    expect(palette[0].hex).toBe('#142878');
    expect(palette[1].weight).toBeCloseTo(0.25);
  });

  it('is deterministic', () => {
    const img = pixels(flat(40, 200, 30, 30), flat(30, 30, 200, 30), flat(30, 30, 30, 200), flat(10, 250, 250, 250));
    expect(paletteFromPixels(img)).toEqual(paletteFromPixels(img));
  });
});

describe('paletteDistance', () => {
  const blue = paletteFromPixels(pixels(flat(90, 20, 40, 120), flat(10, 240, 150, 30)));
  const blueToo = paletteFromPixels(pixels(flat(85, 25, 45, 125), flat(15, 235, 145, 35)));
  const orange = paletteFromPixels(pixels(flat(90, 240, 150, 30), flat(10, 20, 40, 120)));

  it('is zero for the same palette and small for similar ones', () => {
    expect(paletteDistance(blue, blue)).toBeCloseTo(0);
    expect(paletteDistance(blue, blueToo)).toBeLessThan(paletteDistance(blue, orange));
  });

  it('does not let a small accent match a whole photograph of that colour', () => {
    const allOrange = paletteFromPixels(pixels(flat(100, 240, 150, 30)));
    expect(paletteDistance(blue, allOrange)).toBeGreaterThan(paletteDistance(blue, blueToo) * 5);
  });

  it('is symmetric', () => {
    expect(paletteDistance(blue, orange)).toBeCloseTo(paletteDistance(orange, blue));
  });
});

describe('colourRhyme', () => {
  const p = (slug: string, day: string, r: number, g: number, b: number): Paletted => ({
    slug,
    day,
    palette: paletteFromPixels(pixels(flat(100, r, g, b))),
  });
  const items = [
    p('blue-2024', '2024-05-01', 20, 40, 120),
    p('blue-2024-same-day', '2024-05-01', 21, 41, 121),
    p('blue-2024-other-day', '2024-08-09', 24, 44, 124),
    p('blue-2021', '2021-03-02', 26, 46, 126),
    p('orange-2021', '2021-03-02', 240, 150, 30),
  ];

  it('prefers a different year over a closer frame from the same year', () => {
    expect(colourRhyme(items, 'blue-2024')?.slug).toBe('blue-2021');
  });

  it('falls back to another day when every photograph is from the same year', () => {
    const sameYear = items.filter((i) => i.day.startsWith('2024'));
    expect(colourRhyme(sameYear, 'blue-2024')?.slug).toBe('blue-2024-other-day');
  });

  it('is null for an unknown photograph', () => {
    expect(colourRhyme(items, 'nope')).toBeNull();
  });
});

describe('archiveSwatches', () => {
  it('groups photographs by the colours they hold', () => {
    const item = (slug: string, r: number, g: number, b: number): Paletted => ({
      slug,
      day: '2024-01-01',
      palette: paletteFromPixels(pixels(flat(100, r, g, b))),
    });
    const items = [
      item('b1', 20, 40, 150), item('b2', 25, 45, 155), item('b3', 22, 38, 145),
      item('o1', 240, 150, 30), item('o2', 235, 145, 35), item('o3', 245, 155, 25),
      item('lonely', 30, 200, 60),
    ];
    const swatches = archiveSwatches(items, { k: 3, minPhotos: 2 });
    const groups = swatches.map((s) => s.slugs.sort().join(','));
    expect(groups).toContain('b1,b2,b3');
    expect(groups).toContain('o1,o2,o3');
    expect(groups.join(',')).not.toContain('lonely');
  });
});
