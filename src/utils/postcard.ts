// Small pure helpers for the Labs cards and postcards (scripts/card-drawing.ts), kept
// here so they are tested.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2023-04-22" -> "22 APR 2023", the way a postmark prints a date. */
export function postmarkDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * The place for the ring of a postmark: the recorded location, shortened to its first
 * part when the whole thing won't go round ("Death Valley National Park, California" ->
 * "DEATH VALLEY NATIONAL PARK"). Empty when no location was recorded; nothing is guessed.
 */
export function postmarkPlace(location: string | null | undefined, max = 28): string {
  const place = location?.trim().toUpperCase() ?? '';
  if (place.length <= max) return place;
  const first = place.split(',')[0].trim();
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Break text into lines no wider than `max`, measured by `measure` (a canvas's
 * measureText in the browser). Keeps the writer's own line breaks; a word too long for a
 * line is split across lines rather than running off the card.
 */
export function wrapWords(text: string, max: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= max) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // A single word wider than the line: split it by characters.
      let rest = word;
      while (measure(rest) > max) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > max) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  // No trailing empty lines.
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}
