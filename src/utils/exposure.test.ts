import { describe, expect, it } from 'vitest';
import {
  DEVELOP_DEFAULT_MS,
  DEVELOP_MAX_MS,
  DEVELOP_MIN_MS,
  developDuration,
  exposureValue,
  formatShutter,
  parseAperture,
  parseFocal,
  parseShutter,
  stopsBetween,
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

describe('parseAperture and parseFocal', () => {
  it('reads f-numbers', () => {
    expect(parseAperture('f/2.8')).toBe(2.8);
    expect(parseAperture('f/11')).toBe(11);
    expect(parseAperture(undefined)).toBeNull();
  });

  it('reads focal lengths as recorded', () => {
    expect(parseFocal('200.0mm')).toBe(200);
    expect(parseFocal('23mm (35mm eq)')).toBe(23);
    expect(parseFocal('wide')).toBeNull();
    expect(parseFocal(undefined)).toBeNull();
  });
});

describe('exposureValue', () => {
  it('matches the sunny-16 reference: f/16, 1/100s, ISO 100 is about EV 15', () => {
    expect(exposureValue({ aperture: 'f/16', shutterSpeed: '1/100s', iso: '100' })).toBeCloseTo(14.64, 1);
  });

  it('puts a night exposure far below a salt flat at noon', () => {
    const night = exposureValue({ aperture: 'f/1.8', shutterSpeed: '20s', iso: '1600' })!;
    const salt = exposureValue({ aperture: 'f/2.2', shutterSpeed: '1/7500s', iso: '50' })!;
    expect(salt - night).toBeCloseTo(22.77, 1);
  });

  it('is null unless all three settings were recorded', () => {
    expect(exposureValue(undefined)).toBeNull();
    expect(exposureValue({ aperture: 'f/2.8', shutterSpeed: '1/60s' })).toBeNull();
  });
});

describe('stopsBetween and formatShutter', () => {
  it('counts doublings either way round', () => {
    expect(stopsBetween(100, 400)).toBe(2);
    expect(stopsBetween(1 / 60, 1 / 250)).toBeCloseTo(2.06, 2);
  });

  it('writes shutter speeds the way cameras do', () => {
    expect(formatShutter(0.004)).toBe('1/250s');
    expect(formatShutter(20)).toBe('20s');
    expect(formatShutter(0.5)).toBe('1/2s');
    expect(formatShutter(1.3)).toBe('1.3s');
  });
});
