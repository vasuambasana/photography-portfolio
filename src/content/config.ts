import { defineCollection, z } from 'astro:content';

const projectsCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    summary: z.string(),
    category: z.enum(['landscape', 'architecture', 'editorial', 'documentary', 'fine-art']),
    coverImage: image(),
    coverAlt: z.string(),
    date: z.date(),
    location: z.string(),
    clientOrContext: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    cameraSpecs: z.object({
      body: z.string().default('Canon R5 Mark II'),
      lenses: z.array(z.string()).optional(),
    }).optional(),
    gallery: z.array(z.object({
      src: image(),
      alt: z.string(),
      caption: z.string().optional(),
      aspectRatio: z.enum(['3:2', '4:5', '1:1', '16:9', '65:24']).default('3:2'),
      exif: z.object({
        focalLength: z.string().optional(),
        aperture: z.string().optional(),
        shutterSpeed: z.string().optional(),
        iso: z.string().optional(),
      }).optional(),
    })).optional(),
  }),
});

const photosCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    category: z.enum(['architecture', 'nature', 'street', 'night']),
    image: image(),
    alt: z.string(),
    date: z.date(),
    location: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
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

export const collections = {
  projects: projectsCollection,
  photos: photosCollection,
};
