import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { publishedJournal, sortJournal } from '../../utils/journal';

export async function GET(context: APIContext) {
  const entries = sortJournal(publishedJournal(await getCollection('journal')));

  return rss({
    title: 'Journal — Vasu Ambasana Photography',
    description:
      "Stories from the field — location guides, photographer's notes, and visual essays by Vasu Ambasana.",
    site: context.site!,
    // Browsers render raw XML otherwise, which reads as broken to anyone who clicks it.
    stylesheet: '/rss/styles.xsl',
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.excerpt,
      pubDate: entry.data.date,
      link: `/journal/${entry.slug}/`,
      categories: entry.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
