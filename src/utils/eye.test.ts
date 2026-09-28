import { describe, expect, it } from 'vitest';
import { eyeProfile, leanOf, type EyePhoto } from './eye';

const photo = (over: Partial<EyePhoto>): EyePhoto => ({
  slug: 'x',
  category: 'night',
  ev: null,
  focal: null,
  camera: null,
  phone: null,
  year: 2024,
  colours: [],
  ...over,
});

describe('eyeProfile', () => {
  const seen = [
    photo({ slug: 'a', category: 'night', ev: -6.9, focal: 23, camera: 'Samsung Galaxy S22 Ultra', phone: true, year: 2023, colours: ['black', 'deep-blue'] }),
    photo({ slug: 'b', category: 'night', ev: 3.2, focal: 13, camera: 'Samsung Galaxy S22 Ultra', phone: true, year: 2024, colours: ['black', 'orange'] }),
    photo({ slug: 'c', category: 'nature', ev: 13.3, focal: 200, camera: 'Canon EOS R5 Mark II', phone: false, year: 2026, colours: ['deep-blue', 'pale-blue'] }),
    photo({ slug: 'd', category: 'night', ev: -5.4, focal: 23, camera: 'Samsung Galaxy S22 Ultra', phone: true, year: 2023, colours: ['black', 'deep-blue'] }),
  ];
  const eye = eyeProfile(seen);

  it('counts what was opened', () => {
    expect(eye.count).toBe(4);
    expect(eye.years).toEqual([2023, 2026]);
  });

  it('counts after-dark frames by exposure value', () => {
    expect(eye.afterDark).toEqual({ n: 3, of: 4 });
  });

  it('finds the middle focal length and the lean', () => {
    expect(eye.focal).toEqual({ median: 23, lean: 'wide', of: 4 });
  });

  it('names the subject, camera and colour seen most', () => {
    expect(eye.subject).toEqual({ categories: ['night'], n: 3 });
    expect(eye.camera).toEqual({ name: 'Samsung Galaxy S22 Ultra', n: 3 });
    expect(eye.phones).toEqual({ n: 3, of: 4 });
    // A colour, not black, even though black was in more of them.
    expect(eye.colour).toEqual({ keys: ['deep-blue'], n: 3 });
  });

  it('reports a tie as a tie, never a winner picked by the alphabet', () => {
    const even = eyeProfile([
      photo({ category: 'night', camera: 'A', colours: ['red'] }),
      photo({ category: 'architecture', camera: 'B', colours: ['blue'] }),
    ]);
    expect(even.subject).toEqual({ categories: ['architecture', 'night'], n: 1 });
    expect(even.colour).toEqual({ keys: ['blue', 'red'], n: 1 });
    expect(even.camera).toBeNull();
  });

  it('says nothing it cannot back up', () => {
    const thin = eyeProfile([photo({ ev: 2 }), photo({ ev: 3 })]);
    expect(thin.afterDark).toBeNull();
    expect(thin.focal).toBeNull();
    expect(thin.camera).toBeNull();
    expect(eyeProfile([]).years).toBeNull();
  });
});

describe('leanOf', () => {
  it('splits focal lengths into wide, normal and long', () => {
    expect(leanOf(13)).toBe('wide');
    expect(leanOf(50)).toBe('normal');
    expect(leanOf(115)).toBe('long');
  });
});
