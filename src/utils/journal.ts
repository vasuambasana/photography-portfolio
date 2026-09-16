import { getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

const WORDS_PER_MINUTE = 200;

/** Reading time in minutes, derived from the entry body so it can never go stale. */
export function readingTime(body: string): number {
  const words = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_>[\]()`]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function sortJournal(entries: CollectionEntry<'journal'>[]) {
  return [...entries].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Pairs each entry with its resolved cover photo and derived reading time. */
export async function decorate(entries: CollectionEntry<'journal'>[]) {
  return Promise.all(
    entries.map(async (entry) => ({
      entry,
      cover: (await getEntry(entry.data.coverImage))!,
      minutes: readingTime(entry.body),
    }))
  );
}

export function tagSlug(tag: string): string {
  return tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Unique tags across all entries, with the entries that carry each one. */
export function collectTags(entries: CollectionEntry<'journal'>[]) {
  const map = new Map<string, { tag: string; entries: CollectionEntry<'journal'>[] }>();

  for (const entry of entries) {
    for (const tag of entry.data.tags) {
      const slug = tagSlug(tag);
      if (!slug) continue;
      if (!map.has(slug)) map.set(slug, { tag, entries: [] });
      map.get(slug)!.entries.push(entry);
    }
  }

  return map;
}
