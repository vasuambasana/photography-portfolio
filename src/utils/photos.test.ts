import { describe, expect, it } from 'vitest';
import { neighbours, photosInCategory, sortPhotos } from './photos';
import type { Photo } from './photos';

function photo(slug: string, date: string, category = 'nature', order?: number): Photo {
  return {
    slug,
    data: { category, date: new Date(date), order },
  } as unknown as Photo;
}

describe('sortPhotos', () => {
  it('sorts newest first by date', () => {
    const sorted = sortPhotos([
      photo('old', '2020-01-01'),
      photo('new', '2026-01-01'),
      photo('mid', '2023-01-01'),
    ]);

    expect(sorted.map((p) => p.slug)).toEqual(['new', 'mid', 'old']);
  });

  it('puts pinned photos first, ascending, regardless of date', () => {
    const sorted = sortPhotos([
      photo('newest-unpinned', '2026-06-01'),
      photo('pin-2', '2019-01-01', 'nature', 2),
      photo('pin-1', '2018-01-01', 'nature', 1),
    ]);

    expect(sorted.map((p) => p.slug)).toEqual(['pin-1', 'pin-2', 'newest-unpinned']);
  });

  it('breaks date ties on slug so builds are deterministic', () => {
    const forwards = sortPhotos([photo('b', '2024-01-01'), photo('a', '2024-01-01')]);
    const backwards = sortPhotos([photo('a', '2024-01-01'), photo('b', '2024-01-01')]);

    expect(forwards.map((p) => p.slug)).toEqual(['a', 'b']);
    expect(backwards.map((p) => p.slug)).toEqual(['a', 'b']);
  });

  it('does not mutate its input', () => {
    const input = [photo('old', '2020-01-01'), photo('new', '2026-01-01')];
    sortPhotos(input);
    expect(input.map((p) => p.slug)).toEqual(['old', 'new']);
  });
});

describe('photosInCategory', () => {
  it('keeps only the matching category', () => {
    const photos = [photo('a', '2024-01-01', 'night'), photo('b', '2024-01-01', 'street')];
    expect(photosInCategory(photos, 'night').map((p) => p.slug)).toEqual(['a']);
  });
});

describe('neighbours', () => {
  const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];

  it('finds the adjacent entries', () => {
    expect(neighbours(list, 'b')).toEqual({ prev: { slug: 'a' }, next: { slug: 'c' } });
  });

  it('returns null at each end', () => {
    expect(neighbours(list, 'a').prev).toBeNull();
    expect(neighbours(list, 'c').next).toBeNull();
  });

  it('returns nulls for a slug that is not in the list', () => {
    expect(neighbours(list, 'missing')).toEqual({ prev: null, next: null });
  });
});
