import { describe, expect, it } from 'vitest';
import { collectTags, readingTime, sortJournal, tagSlug } from './journal';
import type { CollectionEntry } from 'astro:content';

function entry(slug: string, date: string, tags: string[] = []) {
  return { slug, data: { date: new Date(date), tags } } as unknown as CollectionEntry<'journal'>;
}

describe('readingTime', () => {
  it('rounds to whole minutes at 200 wpm', () => {
    expect(readingTime(Array(400).fill('word').join(' '))).toBe(2);
  });

  it('never returns less than a minute', () => {
    expect(readingTime('short')).toBe(1);
    expect(readingTime('')).toBe(1);
  });

  it('ignores fenced code blocks', () => {
    const body = `intro\n\n\`\`\`\n${Array(1000).fill('code').join(' ')}\n\`\`\`\n\noutro`;
    expect(readingTime(body)).toBe(1);
  });

  it('does not count markdown syntax as words', () => {
    expect(readingTime('# [Heading](/x) **bold**')).toBe(1);
  });
});

describe('sortJournal', () => {
  it('sorts newest first', () => {
    const sorted = sortJournal([entry('old', '2020-01-01'), entry('new', '2026-01-01')]);
    expect(sorted.map((e) => e.slug)).toEqual(['new', 'old']);
  });

  it('does not mutate its input', () => {
    const input = [entry('old', '2020-01-01'), entry('new', '2026-01-01')];
    sortJournal(input);
    expect(input.map((e) => e.slug)).toEqual(['old', 'new']);
  });
});

describe('tagSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(tagSlug('New England')).toBe('new-england');
    expect(tagSlug('Blue Hour')).toBe('blue-hour');
  });

  it('strips leading and trailing separators', () => {
    expect(tagSlug('  cold light! ')).toBe('cold-light');
  });

  it('returns an empty string when nothing survives', () => {
    expect(tagSlug('!!!')).toBe('');
  });
});

describe('collectTags', () => {
  it('groups entries by tag slug', () => {
    const tags = collectTags([
      entry('a', '2026-01-01', ['winter', 'coast']),
      entry('b', '2025-01-01', ['winter']),
    ]);

    expect(tags.get('winter')?.entries.map((e) => e.slug)).toEqual(['a', 'b']);
    expect(tags.get('coast')?.entries.map((e) => e.slug)).toEqual(['a']);
  });

  it('folds tags that differ only in case or spacing', () => {
    const tags = collectTags([
      entry('a', '2026-01-01', ['New England']),
      entry('b', '2025-01-01', ['new england']),
    ]);

    expect(tags.size).toBe(1);
    expect(tags.get('new-england')?.entries).toHaveLength(2);
  });

  it('skips tags that slugify to nothing', () => {
    expect(collectTags([entry('a', '2026-01-01', ['!!!'])]).size).toBe(0);
  });
});
