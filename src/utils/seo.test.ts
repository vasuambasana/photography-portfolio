import { describe, expect, it } from 'vitest';
import { breadcrumbList, exifData, metaDescription, truncate } from './seo';
import type { CollectionEntry } from 'astro:content';

type Specs = CollectionEntry<'photos'>['data']['cameraSpecs'];

describe('metaDescription', () => {
  it('prefers the body over the fallback', () => {
    expect(metaDescription('A tunnel lit by graffiti.', 'A street photograph')).toBe(
      'A tunnel lit by graffiti.'
    );
  });

  it('falls back when the body is empty or whitespace', () => {
    expect(metaDescription('', 'A street photograph')).toBe('A street photograph');
    expect(metaDescription('   \n\n  ', 'A street photograph')).toBe('A street photograph');
  });

  it('strips markdown syntax, links and images', () => {
    const body = '## Heading\n\nSee [the ridge](/photo/ridge) at ![dusk](/x.jpg) **today**.';
    expect(metaDescription(body, 'fallback')).toBe('Heading See the ridge at today.');
  });

  it('drops fenced code blocks', () => {
    expect(metaDescription('before\n\n```\nconst x = 1;\n```\n\nafter', 'fallback')).toBe(
      'before after'
    );
  });

  it('collapses newlines into single spaces', () => {
    expect(metaDescription('one\n\ntwo\nthree', 'fallback')).toBe('one two three');
  });

  it('keeps the result within the snippet limit', () => {
    expect(metaDescription(Array(200).fill('word').join(' '), 'fallback').length)
      .toBeLessThanOrEqual(160);
  });
});

describe('truncate', () => {
  it('leaves short text untouched', () => {
    expect(truncate('short', 20)).toBe('short');
  });

  it('cuts at a word boundary', () => {
    expect(truncate('the quick brown fox jumps', 20)).toBe('the quick brown…');
  });

  it('strips trailing punctuation before the ellipsis', () => {
    expect(truncate('the quick brown, fox jumps', 18)).toBe('the quick brown…');
  });

  it('hard-cuts a single word longer than the limit', () => {
    expect(truncate('a'.repeat(50), 10)).toBe(`${'a'.repeat(9)}…`);
  });
});

describe('breadcrumbList', () => {
  it('numbers positions from one and absolutises paths', () => {
    const schema = breadcrumbList(
      [
        { name: 'Home', path: '/' },
        { name: 'Gallery', path: '/gallery' },
      ],
      'https://example.com'
    );

    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
      { '@type': 'ListItem', position: 2, name: 'Gallery', item: 'https://example.com/gallery/' },
    ]);
  });

  it('matches the trailing slash Astro puts on canonicals', () => {
    const schema = breadcrumbList([{ name: 'Photo', path: '/photo/x' }], 'https://example.com');
    expect(schema.itemListElement[0].item).toBe('https://example.com/photo/x/');
  });

  it('does not double the slash on a path that already has one', () => {
    const schema = breadcrumbList([{ name: 'Gallery', path: '/gallery/' }], 'https://example.com');
    expect(schema.itemListElement[0].item).toBe('https://example.com/gallery/');
  });
});

describe('exifData', () => {
  it('returns nothing when the photo carries no specs', () => {
    expect(exifData(undefined)).toEqual([]);
  });

  it('omits settings the file did not record', () => {
    const specs = { body: 'Canon R5 Mark II', iso: '1250' } as Specs;

    expect(exifData(specs)).toEqual([
      { '@type': 'PropertyValue', name: 'Camera', value: 'Canon R5 Mark II' },
      { '@type': 'PropertyValue', name: 'ISO', value: '1250' },
    ]);
  });
});
