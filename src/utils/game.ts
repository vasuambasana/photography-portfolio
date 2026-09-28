// Guess the Exposure (/play, Labs): the rules, kept pure so they are tested.
//
// Every dial is on a log scale in thirds of a stop, the way cameras step, and every
// score is measured in stops: a guess of 1/125s for a 1/250s photograph is one stop out,
// whether the photograph was at 1/250s or 30s.

import { stopsBetween } from './exposure';

/** Seeded, so every visitor gets the same photograph on the same day. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fixed shuffle of 0..n-1, the same on every visit. */
export function dailyOrder(n: number, seed = 20260928): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Days since 1 January 1970 for a local calendar date, so the photograph changes at midnight. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

/** Which photograph is today's: walks the fixed shuffle one step a day, then starts again. */
export function dailyIndex(day: number, n: number): number {
  const order = dailyOrder(n);
  return order[((day % n) + n) % n];
}

export interface Dial {
  key: 'shutter' | 'iso' | 'focal';
  label: string;
  /** Range, in thirds of a stop. */
  min: number;
  max: number;
  /** The dial's resting position, in thirds of a stop. */
  start: number;
  /** Value at a position. */
  value: (step: number) => number;
  /** Position nearest a value. */
  step: (value: number) => number;
}

const third = (base: number) => ({
  value: (step: number) => base * 2 ** (step / 3),
  step: (value: number) => Math.round(Math.log2(value / base) * 3),
});

export const DIALS: Dial[] = [
  // 1/8000s to about 17 minutes.
  { key: 'shutter', label: 'Shutter speed', min: -39, max: 30, start: -18, ...third(1) },
  // ISO 12 to 25600.
  { key: 'iso', label: 'ISO', min: -9, max: 24, start: 0, ...third(100) },
  // 12mm to 800mm.
  { key: 'focal', label: 'Focal length', min: -6, max: 12, start: 0, ...third(50) },
];

// ISO values as cameras print them, rather than 2^(k/3) with decimals.
const ISO_STOPS = [12, 16, 20, 25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600];

export function formatIso(value: number): string {
  const nearest = ISO_STOPS.reduce((a, b) => (Math.abs(Math.log2(b / value)) < Math.abs(Math.log2(a / value)) ? b : a));
  return `ISO ${nearest}`;
}

// Shutter speeds as cameras print them in thirds of a stop, rather than powers of two:
// 1/250s, not 1/256s.
const SHUTTER_STOPS = [
  1 / 8000, 1 / 6400, 1 / 5000, 1 / 4000, 1 / 3200, 1 / 2500, 1 / 2000, 1 / 1600, 1 / 1250, 1 / 1000, 1 / 800,
  1 / 640, 1 / 500, 1 / 400, 1 / 320, 1 / 250, 1 / 200, 1 / 160, 1 / 125, 1 / 100, 1 / 80, 1 / 60, 1 / 50, 1 / 40,
  1 / 30, 1 / 25, 1 / 20, 1 / 15, 1 / 13, 1 / 10, 1 / 8, 1 / 6, 1 / 5, 1 / 4, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6,
  2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30,
];

export function formatShutterStop(seconds: number): string {
  if (seconds > 30) return `${Math.round(seconds)}s`;
  const nearest = SHUTTER_STOPS.reduce((a, b) => (Math.abs(Math.log2(b / seconds)) < Math.abs(Math.log2(a / seconds)) ? b : a));
  return nearest >= 0.3 ? `${nearest}s` : `1/${Math.round(1 / nearest)}s`;
}

export function formatFocal(value: number): string {
  return `${Math.round(value)}mm`;
}

export type Mark = 'spot-on' | 'close' | 'near' | 'off';

/** How far out a guess was, in stops. */
export function markFor(stops: number): Mark {
  if (stops <= 1 / 3 + 1e-9) return 'spot-on';
  if (stops <= 1 + 1e-9) return 'close';
  if (stops <= 2 + 1e-9) return 'near';
  return 'off';
}

export const MARK_EMOJI: Record<Mark, string> = { 'spot-on': '🟩', close: '🟨', near: '🟧', off: '🟥' };

/** 100 for a perfect dial, 25 fewer for every stop out, never below nothing. */
export function dialScore(guess: number, actual: number): number {
  return Math.max(0, Math.round(100 - stopsBetween(guess, actual) * 25));
}

export function shareText(day: string, marks: Mark[], total: number, url: string): string {
  return [`Guess the exposure · ${day}`, marks.map((m) => MARK_EMOJI[m]).join(' '), `${total}/${marks.length * 100}`, url].join('\n');
}

/** The streak after playing on `day`: one more if yesterday was played, else a fresh start. */
export function nextStreak(previous: { day: number; streak: number } | null, day: number): number {
  if (!previous) return 1;
  if (previous.day === day) return previous.streak;
  return previous.day === day - 1 ? previous.streak + 1 : 1;
}
