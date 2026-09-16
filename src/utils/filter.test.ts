import { describe, expect, it } from 'vitest';
import { ALL_FILTER, getActiveFilter, matchesFilter, withFilter } from './filter';

// Four places used to read this state independently and disagreed about the
// no-param case, which is what the default-to-'all' tests below pin down.
describe('getActiveFilter', () => {
  it('reads the filter from the query string', () => {
    expect(getActiveFilter('?filter=night')).toBe('night');
  });

  it('defaults to "all" when the param is absent', () => {
    expect(getActiveFilter('')).toBe(ALL_FILTER);
    expect(getActiveFilter('?other=1')).toBe(ALL_FILTER);
  });

  it('defaults to "all" when the param is empty', () => {
    expect(getActiveFilter('?filter=')).toBe(ALL_FILTER);
  });
});

describe('withFilter', () => {
  it('adds the filter to a bare path', () => {
    expect(withFilter('/photo/abc', 'night')).toBe('/photo/abc?filter=night');
  });

  it('replaces an existing filter rather than appending a second', () => {
    expect(withFilter('/photo/abc?filter=street', 'night')).toBe('/photo/abc?filter=night');
  });

  it('preserves other query params', () => {
    expect(withFilter('/photo/abc?ref=home', 'night')).toBe('/photo/abc?ref=home&filter=night');
  });
});

describe('matchesFilter', () => {
  it('matches everything under the "all" filter', () => {
    expect(matchesFilter('night', ALL_FILTER)).toBe(true);
    expect(matchesFilter(undefined, ALL_FILTER)).toBe(true);
  });

  it('matches only the named category otherwise', () => {
    expect(matchesFilter('night', 'night')).toBe(true);
    expect(matchesFilter('street', 'night')).toBe(false);
    expect(matchesFilter(undefined, 'night')).toBe(false);
  });
});
