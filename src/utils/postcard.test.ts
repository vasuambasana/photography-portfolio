import { describe, expect, it } from 'vitest';
import { postmarkDate, postmarkPlace, wrapWords } from './postcard';

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
