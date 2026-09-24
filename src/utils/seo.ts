import type { CollectionEntry } from 'astro:content';
import { cameraName } from './camera';

/** Google truncates snippets around here; longer text is written for nobody. */
const DESCRIPTION_LIMIT = 160;

export interface Crumb {
  name: string;
  /** Site-root-relative path, e.g. `/gallery`. */
  path: string;
}

/**
 * Turns a markdown body into a meta description.
 *
 * Alt text is written for screen readers and is often deliberately literal
 * ("A street photograph"), which makes a poor search snippet. The body copy
 * describes the picture, so prefer it and keep alt as the fallback.
 */
export function metaDescription(body: string, fallback: string): string {
  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!prose) return fallback;
  return truncate(prose, DESCRIPTION_LIMIT);
}

/** Cuts at a word boundary and adds an ellipsis only when something was lost. */
export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;

  const clipped = text.slice(0, limit - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? clipped.slice(0, lastSpace) : clipped).replace(/[.,;:—-]$/, '')}…`;
}

/**
 * BreadcrumbList JSON-LD. Google renders these in place of the bare URL.
 *
 * Astro emits directory-style pages, so canonicals carry a trailing slash.
 * Breadcrumb items have to match them exactly or the two disagree about which
 * URL the crumb names.
 */
export function breadcrumbList(crumbs: Crumb[], siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.path.endsWith('/') ? crumb.path : `${crumb.path}/`, siteUrl).toString(),
    })),
  };
}

/**
 * EXIF as schema.org `exifData` property/value pairs.
 *
 * Only reports settings the file actually carried. An absent aperture means
 * the camera never wrote one, and inventing a plausible value would be a lie
 * about the photograph.
 */
export function exifData(specs: CollectionEntry<'photos'>['data']['cameraSpecs']) {
  if (!specs) return [];

  const pairs: Array<[string, string | undefined]> = [
    ['Camera', cameraName(specs.body) ?? undefined],
    ['Lens', specs.lens],
    ['FocalLength', specs.focalLength],
    ['Aperture', specs.aperture],
    ['ShutterSpeed', specs.shutterSpeed],
    ['ISO', specs.iso],
  ];

  return pairs
    .filter((pair): pair is [string, string] => Boolean(pair[1]))
    .map(([name, value]) => ({ '@type': 'PropertyValue', name, value }));
}
