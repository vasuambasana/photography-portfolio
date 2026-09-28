import { describe, expect, it } from 'vitest';
import { backLayout, postcardSize, postmarkDate, postmarkPlace, stampValue, wrapWords, type Box } from './postcard';

describe('postmarkDate', () => {
  it('prints the date the way a postmark does', () => {
    expect(postmarkDate('2023-04-22')).toBe('22 APR 2023');
    expect(postmarkDate('2026-02-28T00:00:00.000Z')).toBe('28 FEB 2026');
    expect(postmarkDate('')).toBe('');
  });
});

describe('postmarkPlace', () => {
  it('uses the recorded place, shortened to fit the ring', () => {
    expect(postmarkPlace('Boston')).toBe('BOSTON');
    expect(postmarkPlace('Death Valley National Park, California')).toBe('DEATH VALLEY NATIONAL PARK');
  });

  it('says nothing when no place was recorded', () => {
    expect(postmarkPlace(null)).toBe('');
    expect(postmarkPlace('')).toBe('');
  });
});

describe('wrapWords', () => {
  // One unit per character, so widths are easy to reason about.
  const measure = (s: string) => s.length;

  it('fills lines up to the width', () => {
    expect(wrapWords('the quick brown fox jumps', 10, measure)).toEqual(['the quick', 'brown fox', 'jumps']);
  });

  it("keeps the writer's own line breaks", () => {
    expect(wrapWords('Hello\nfrom here', 20, measure)).toEqual(['Hello', 'from here']);
  });

  it('splits a word too long for any line', () => {
    expect(wrapWords('abcdefghijkl', 5, measure)).toEqual(['abcde', 'fghij', 'kl']);
  });

  it('returns nothing for nothing', () => {
    expect(wrapWords('   ', 10, measure)).toEqual([]);
  });
});

describe('postcardSize', () => {
  // Every shape in the archive runs from a tall phone frame (about 0.45) to a wide 2:1.
  const shapes = [0.45, 0.5625, 0.667, 0.75, 0.8, 1, 1.2, 1.333, 1.5, 1.778, 2, 2.6, 3.2];

  it("keeps the photograph's own shape, so the front never crops or stretches it", () => {
    for (const a of shapes) {
      const { w, h } = postcardSize(a * 3000, 3000);
      expect(Math.abs(w / h - a) / a).toBeLessThan(0.003);
    }
  });

  it('is at least 1000px on the short side, and never absurdly long', () => {
    for (const a of shapes) {
      const { w, h } = postcardSize(a * 3000, 3000);
      expect(Math.max(w, h)).toBeLessThanOrEqual(2600);
      if (a >= 0.385 && a <= 2.6) expect(Math.min(w, h)).toBeGreaterThanOrEqual(1000);
    }
  });
});

describe('backLayout', () => {
  const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const inside = (b: Box, w: number, h: number) => b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h;

  for (const a of [0.45, 0.5625, 0.667, 0.75, 0.8, 1, 1.2, 1.333, 1.5, 1.778, 2, 2.6]) {
    it(`keeps everything apart on a card of shape ${a}`, () => {
      const { w, h } = postcardSize(a * 3000, 3000);
      const l = backLayout(w, h);
      const pm = l.postmark;
      const boxes: Record<string, Box> = {
        heading: { x: l.heading.x, y: l.heading.y - 26, w: 240, h: 32 },
        stamp: l.stamp,
        postmark: { x: pm.cx - pm.r, y: pm.cy - pm.r, w: pm.r * 2, h: pm.r * 2 },
        waves: { x: pm.wavesTo, y: pm.cy - 36, w: pm.wavesFrom - pm.wavesTo, h: 72 },
        note: l.note,
        address: { x: l.address.x1, y: l.address.ys[0] - 4, w: l.address.x2 - l.address.x1, h: l.address.ys[3] - l.address.ys[0] + 8 },
        caption: { x: l.caption.x, y: l.caption.y - 30, w: l.caption.w, h: 108 },
      };
      for (const [name, box] of Object.entries(boxes)) expect(inside(box, w, h), `${name} inside`).toBe(true);
      const apart: [string, string][] = [
        ['note', 'caption'], ['note', 'address'], ['note', 'postmark'], ['note', 'stamp'], ['note', 'waves'],
        ['address', 'caption'], ['address', 'postmark'], ['address', 'stamp'], ['heading', 'waves'], ['heading', 'postmark'],
      ];
      for (const [x, y] of apart) expect(overlaps(boxes[x], boxes[y]), `${x} clear of ${y}`).toBe(false);
      // Room for a real note: at least four lines of handwriting-sized type.
      expect(l.note.h).toBeGreaterThanOrEqual(4 * 62 - 20);
      // Address lines in order, with room to write on each.
      l.address.ys.slice(1).forEach((y, i) => expect(y - l.address.ys[i]).toBeGreaterThanOrEqual(50));
    });
  }
});

describe('stampValue', () => {
  it("prints the shutter speed as a stamp's value", () => {
    expect(stampValue('1/60s')).toBe('1/60');
    expect(stampValue('20s')).toBe('20s');
    expect(stampValue(null)).toBe('');
  });
});
