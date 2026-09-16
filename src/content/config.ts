import { defineCollection, reference, z } from 'astro:content';

export const PHOTO_CATEGORIES = [
  'architecture',
  'nature',
  'street',
  'night',
  'people',
  'portrait',
  'travel',
  'abstract',
] as const;

export const JOURNAL_TYPE_KEYS = [
  'field-notes',
  'location-guide',
  'essay',
  'behind-the-lens',
] as const;

export type JournalType = (typeof JOURNAL_TYPE_KEYS)[number];

export const JOURNAL_TYPE_LABELS: Record<JournalType, string> = {
  'field-notes': 'Field Notes',
  'location-guide': 'Location Guide',
  essay: 'Essay',
  'behind-the-lens': 'Behind the Lens',
};

const photosCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    category: z.enum(PHOTO_CATEGORIES),
    image: image(),
    alt: z.string(),
    date: z.date(),
    location: z.string().optional(),
    originalFilename: z.string().optional(),
    featured: z.boolean().default(false),
    // Optional manual pin. Photos with `order` sort first, ascending; everything
    // else falls back to newest-first by date.
    order: z.number().optional(),
    cameraSpecs: z.object({
      body: z.string().optional(),
      lens: z.string().optional(),
      focalLength: z.string().optional(),
      aperture: z.string().optional(),
      shutterSpeed: z.string().optional(),
      iso: z.string().optional(),
    }).optional(),
  }),
});

const journalCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    type: z.enum(JOURNAL_TYPE_KEYS).default('field-notes'),
    date: z.date(),
    coverImage: reference('photos'),
    location: z.string().optional(),
    tags: z.array(z.string()).default([]),
    excerpt: z.string(),
    featured: z.boolean().default(false),
    // Drafts render in `astro dev` but are stripped from production builds, so an entry
    // can sit half-written in the repo without going live.
    draft: z.boolean().default(false),
    relatedPhotos: z.array(reference('photos')).default([]),
  }),
});

export const collections = {
  photos: photosCollection,
  journal: journalCollection,
};
