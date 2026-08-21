/**
 * Computes aspect ratio from width and height.
 */
export function getAspectRatio(width: number, height: number): string {
  if (!width || !height) return '3/2';
  
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  
  return `${width / divisor}/${height / divisor}`;
}

export type AllowedAspectRatio = '3:2' | '4:5' | '1:1' | '16:9' | '65:24';

export const RATIO_MAP: Record<AllowedAspectRatio, string> = {
  '3:2': '3/2',
  '4:5': '4/5',
  '1:1': '1/1',
  '16:9': '16/9',
  '65:24': '65/24',
};
