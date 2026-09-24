import { describe, expect, it } from 'vitest';
import { cameraName } from './camera';

describe('cameraName', () => {
  it('turns model codes into the names the phones were sold under', () => {
    expect(cameraName('samsung SM-S908U1')).toBe('Samsung Galaxy S22 Ultra');
    expect(cameraName('samsung SM-N976U')).toBe('Samsung Galaxy Note10+ 5G');
    expect(cameraName('OnePlus GM1917')).toBe('OnePlus 7 Pro');
    expect(cameraName('Canon EOS R5m2')).toBe('Canon EOS R5 Mark II');
  });

  it('capitalises the Samsung make and leaves the model alone', () => {
    expect(cameraName('samsung Galaxy Z Fold7')).toBe('Samsung Galaxy Z Fold7');
  });

  it('passes through names that are already readable', () => {
    expect(cameraName('Apple iPhone 17 Pro')).toBe('Apple iPhone 17 Pro');
    expect(cameraName('Canon EOS 700D')).toBe('Canon EOS 700D');
  });

  it('returns null for missing or placeholder bodies', () => {
    expect(cameraName(undefined)).toBeNull();
    expect(cameraName('')).toBeNull();
    expect(cameraName('Unknown Body')).toBeNull();
  });
});
