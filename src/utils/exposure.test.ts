import { describe, expect, it } from 'vitest';
import {
  DEVELOP_DEFAULT_MS,
  DEVELOP_MAX_MS,
  DEVELOP_MIN_MS,
  developDuration,
  exposureValue,
  parseAperture,
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

describe('parseAperture', () => {
  it('reads f-numbers', () => {
    expect(parseAperture('f/2.8')).toBe(2.8);
    expect(parseAperture('f/11')).toBe(11);
    expect(parseAperture(undefined)).toBeNull();
  });
});

describe('exposureValue', () => {
  it('matches the sunny-16 reference: f/16, 1/100s, ISO 100 is about EV 15', () => {
    expect(exposureValue({ aperture: 'f/16', shutterSpeed: '1/100s', iso: '100' })).toBeCloseTo(14.64, 1);
  });

  it('puts a twenty-second night frame far below a bright salt flat', () => {
    const night = exposureValue({ aperture: 'f/1.8', shutterSpeed: '20s', iso: '1600' })!;
    const salt = exposureValue({ aperture: 'f/2.2', shutterSpeed: '1/7500s', iso: '50' })!;
    expect(salt - night).toBeCloseTo(22.77, 1);
  });

  it('is null when any setting is missing', () => {
    expect(exposureValue(undefined)).toBeNull();
    expect(exposureValue({ aperture: 'f/2.8', shutterSpeed: '1/60s' })).toBeNull();
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
