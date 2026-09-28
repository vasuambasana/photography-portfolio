import { describe, expect, it } from 'vitest';
import {
  accentFromPalette,
  archiveSwatches,
  colourRhyme,
  contrast,
  deltaE,
  familyOf,
  labToHex,
  paletteDistance,
  paletteFromPixels,
  rgbToLab,
  tintedSurface,
  type Paletted,
  type Rgb,
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

describe('colour families', () => {
  const family = (r: number, g: number, b: number) => familyOf(rgbToLab(r, g, b)).key;

  it('names colours the way people do', () => {
    expect(family(5, 5, 6)).toBe('black');
    expect(family(60, 60, 62)).toBe('charcoal');
    expect(family(130, 130, 130)).toBe('grey');
    expect(family(240, 240, 238)).toBe('white');
    expect(family(100, 65, 40)).toBe('brown');
    expect(family(235, 150, 180)).toBe('pink');
    expect(family(210, 40, 35)).toBe('red');
    expect(family(245, 150, 30)).toBe('orange');
    expect(family(240, 220, 60)).toBe('yellow');
    expect(family(80, 90, 35)).toBe('olive');
    expect(family(40, 150, 60)).toBe('green');
    expect(family(40, 140, 140)).toBe('teal');
    expect(family(135, 200, 235)).toBe('pale-blue');
    expect(family(40, 90, 160)).toBe('blue');
    expect(family(10, 25, 70)).toBe('deep-blue');
    expect(family(120, 70, 150)).toBe('violet');
  });
});

describe('archiveSwatches', () => {
  const item = (slug: string, ...colours: [number, number, number, number][]): Paletted => ({
    slug,
    day: '2024-01-01',
    palette: paletteFromPixels(pixels(...colours.map(([n, r, g, b]) => flat(n, r, g, b)))),
  });

  it('groups photographs by the colours they hold', () => {
    const items = [
      item('b1', [100, 40, 90, 160]), item('b2', [100, 45, 95, 165]), item('b3', [100, 38, 85, 155]),
      item('o1', [100, 245, 150, 30]), item('o2', [100, 240, 145, 35]), item('o3', [100, 250, 155, 25]),
      item('lonely', [100, 40, 150, 60]),
    ];
    const swatches = archiveSwatches(items, { minPhotos: 2 });
    expect(swatches.map((s) => s.key)).toEqual(['orange', 'blue']);
    expect(swatches[0].slugs).toEqual(['o1', 'o2', 'o3']);
    expect(swatches[1].slugs).toEqual(['b1', 'b2', 'b3']);
  });

  it('counts a small vivid accent, but not a small patch of grey', () => {
    const items = ['a', 'b', 'c'].map((slug) => item(slug, [90, 20, 20, 22], [10, 215, 35, 30]));
    const keys = archiveSwatches(items).map((s) => s.key);
    expect(keys).toContain('red');
    expect(keys).toContain('black');
    const greyAccent = ['a', 'b', 'c'].map((slug) => item(slug, [90, 20, 20, 22], [10, 130, 130, 130]));
    expect(archiveSwatches(greyAccent).map((s) => s.key)).toEqual(['black']);
  });

  it('shows each colour as it appears in the photographs', () => {
    const items = ['a', 'b', 'c'].map((slug) => item(slug, [100, 210, 40, 35]));
    const [red] = archiveSwatches(items);
    expect(deltaE(red.lab, rgbToLab(210, 40, 35))).toBeLessThan(3);
  });
});

describe('accentFromPalette', () => {
  const LIGHT: Rgb[] = [[250, 250, 250], [255, 255, 255], [244, 244, 245]];
  const DARK: Rgb[] = [[9, 9, 11], [18, 18, 21], [28, 28, 33]];

  it("takes the photograph's own colour and makes it readable in both themes", () => {
    const palette = paletteFromPixels(pixels(flat(70, 20, 20, 22), flat(30, 110, 170, 230)));
    const accent = accentFromPalette(palette)!;
    for (const bg of LIGHT) expect(contrast(accent.light, bg)).toBeGreaterThanOrEqual(4.5);
    for (const bg of DARK) expect(contrast(accent.dark, bg)).toBeGreaterThanOrEqual(4.5);
    // Still blue: same hue family as the sky it came from.
    expect(familyOf(rgbToLab(...accent.light)).key).toMatch(/blue/);
    expect(familyOf(rgbToLab(...accent.dark)).key).toMatch(/blue/);
  });

  it('prefers a vivid colour with real area over a dull one that covers more', () => {
    const palette = paletteFromPixels(pixels(flat(60, 120, 110, 95), flat(40, 230, 90, 30)));
    const accent = accentFromPalette(palette)!;
    expect(['red', 'orange']).toContain(familyOf(rgbToLab(...accent.light)).key);
  });

  it('leaves a photograph without real colour alone', () => {
    expect(accentFromPalette(paletteFromPixels(pixels(flat(60, 30, 30, 30), flat(40, 200, 200, 198))))).toBeNull();
  });
});

describe('tintedSurface', () => {
  it('leans the background towards the accent only as far as the text allows', () => {
    const text: Rgb = [113, 113, 122];
    const tinted = tintedSurface([250, 250, 250], [37, 99, 235], text, 0.06);
    expect(contrast(text, tinted)).toBeGreaterThanOrEqual(4.5);
    expect(tinted).not.toEqual([250, 250, 250]);
  });
});
