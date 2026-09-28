import { describe, expect, it } from 'vitest';
import { DIALS, dailyIndex, dailyOrder, dayNumber, dialScore, formatIso, formatShutterStop, markFor, nextStreak, shareText } from './game';

describe('daily photograph', () => {
  it('is a fixed shuffle that visits every photograph once per cycle', () => {
    const order = dailyOrder(50);
    expect(new Set(order).size).toBe(50);
    expect(dailyOrder(50)).toEqual(order);
    const cycle = Array.from({ length: 50 }, (_, d) => dailyIndex(20000 + d, 50));
    expect(new Set(cycle).size).toBe(50);
  });

  it('changes at local midnight, not UTC', () => {
    expect(dayNumber(new Date(2026, 8, 28, 0, 5))).toBe(dayNumber(new Date(2026, 8, 28, 23, 55)));
    expect(dayNumber(new Date(2026, 8, 29, 0, 5)) - dayNumber(new Date(2026, 8, 28, 23, 55))).toBe(1);
  });
});

describe('dials', () => {
  const [shutter, iso, focal] = DIALS;

  it('step in thirds of a stop and round-trip', () => {
    expect(shutter.value(shutter.step(1 / 250))).toBeCloseTo(1 / 256, 4);
    expect(iso.step(200)).toBe(3);
    expect(focal.value(focal.step(200))).toBeCloseTo(200, 0);
  });

  it('reach every setting in the archive', () => {
    expect(shutter.step(1 / 8000)).toBeGreaterThanOrEqual(shutter.min);
    expect(shutter.step(693)).toBeLessThanOrEqual(shutter.max);
    expect(iso.step(12)).toBeGreaterThanOrEqual(iso.min);
    expect(focal.step(13)).toBeGreaterThanOrEqual(focal.min);
    expect(focal.step(230)).toBeLessThanOrEqual(focal.max);
  });

  it('print shutter speeds the way cameras do', () => {
    expect(formatShutterStop(shutter.value(shutter.step(1 / 250)))).toBe('1/250s');
    expect(formatShutterStop(shutter.value(-18))).toBe('1/60s');
    expect(formatShutterStop(shutter.value(-2))).toBe('0.6s');
    expect(formatShutterStop(shutter.value(13))).toBe('20s');
    expect(formatShutterStop(shutter.value(30))).toBe('1024s');
  });

  it('print ISO the way cameras do', () => {
    expect(formatIso(iso.value(3))).toBe('ISO 200');
    expect(formatIso(iso.value(1))).toBe('ISO 125');
  });
});

describe('scoring', () => {
  it('scores in stops', () => {
    expect(dialScore(100, 100)).toBe(100);
    expect(dialScore(200, 100)).toBe(75);
    expect(dialScore(50, 100)).toBe(75);
    expect(dialScore(1 / 8000, 30)).toBe(0);
  });

  it('marks how far out a guess was', () => {
    expect(markFor(0)).toBe('spot-on');
    expect(markFor(1 / 3)).toBe('spot-on');
    expect(markFor(1)).toBe('close');
    expect(markFor(1.7)).toBe('near');
    expect(markFor(4)).toBe('off');
  });

  it('shares a result without giving the answer away', () => {
    const text = shareText('28 Sep 2026', ['spot-on', 'close', 'off'], 180, 'https://vasuambasana.com/play');
    expect(text).toBe('Guess the exposure · 28 Sep 2026\n🟩 🟨 🟥\n180/300\nhttps://vasuambasana.com/play');
  });
});

describe('streak', () => {
  it('grows on consecutive days and restarts after a gap', () => {
    expect(nextStreak(null, 100)).toBe(1);
    expect(nextStreak({ day: 99, streak: 4 }, 100)).toBe(5);
    expect(nextStreak({ day: 100, streak: 5 }, 100)).toBe(5);
    expect(nextStreak({ day: 97, streak: 9 }, 100)).toBe(1);
  });
});
