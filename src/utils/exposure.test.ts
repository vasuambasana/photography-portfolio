import { describe, expect, it } from 'vitest';
import {
  DEVELOP_DEFAULT_MS,
  DEVELOP_MAX_MS,
  DEVELOP_MIN_MS,
  developDuration,
  parseShutter,
} from './exposure';

describe('parseShutter', () => {
  it('reads fractions and whole seconds', () => {
    expect(parseShutter('1/250s')).toBeCloseTo(0.004);
    expect(parseShutter('20s')).toBe(20);
    expect(parseShutter('693s')).toBe(693);
  });

  it('returns null for anything it cannot read', () => {
    expect(parseShutter(undefined)).toBeNull();
    expect(parseShutter('')).toBeNull();
    expect(parseShutter('Unknown s')).toBeNull();
    expect(parseShutter('0s')).toBeNull();
  });
});

describe('developDuration', () => {
  it('is fast for fast shutters and slow for long exposures', () => {
    expect(developDuration('1/8000s')).toBe(DEVELOP_MIN_MS);
    expect(developDuration('30s')).toBe(DEVELOP_MAX_MS);
    expect(developDuration('1/7500s')).toBeLessThan(developDuration('1/60s'));
    expect(developDuration('1/60s')).toBeLessThan(developDuration('20s'));
  });

  it('clamps beyond the range', () => {
    expect(developDuration('693s')).toBe(DEVELOP_MAX_MS);
  });

  it('falls back to a middle value when there is no shutter speed', () => {
    expect(developDuration(undefined)).toBe(DEVELOP_DEFAULT_MS);
  });
});
