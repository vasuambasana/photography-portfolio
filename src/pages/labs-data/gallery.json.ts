// Labs data for the gallery, as a file of its own: the gallery page fetches it only when
// a Labs feature needs it (turning the cards over, the contact sheet, "Your eye"), so
// visitors on the stable site never download it.

import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { getArchive } from '../../data/archive';
import { cameraName, comparableFocal, isPhone, specLine } from '../../utils/camera';
import { sortPhotos } from '../../utils/photos';

export const GET: APIRoute = async () => {
  const { swatches, facts } = await getArchive();
  const photos = sortPhotos(await getCollection('photos'));

  const entries = await Promise.all(
    photos.map(async (p) => {
      const specs = p.data.cameraSpecs;
      const measured = facts.get(p.slug);
      const ev = measured?.ev ?? null;
      const focal = specs?.focalLength?.replace(/\s*\(35mm eq\)/, '').replace(/\.0mm$/, 'mm');
      return [
        p.slug,
        {
          title: p.data.title,
          src: (await getImage({ src: p.data.image, width: 400, format: 'webp' })).src,
          category: p.data.category,
          ev: ev === null ? null : Math.round(ev * 10) / 10,
          focal: comparableFocal(specs),
          camera: cameraName(specs?.body),
          phone: isPhone(specs?.body),
          year: p.data.date.getUTCFullYear(),
          colours: swatches.filter((s) => s.slugs.includes(p.slug)).map((s) => s.key),
          // For the back of the card and the contact sheet's margin.
          date: p.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }),
          location: p.data.location || null,
          settings: [specs?.aperture, specs?.shutterSpeed, specs?.iso && `ISO ${specs.iso}`, focal].filter(Boolean).join(' · '),
          palette: (measured?.palette ?? []).filter((c) => c.weight >= 0.04).map((c) => c.hex),
          sheet: specLine(specs) || 'no settings recorded',
        },
      ] as const;
    })
  );

  return new Response(
    JSON.stringify({
      total: photos.length,
      swatches: swatches.map((s) => ({ key: s.key, name: s.name, hex: s.hex })),
      photos: Object.fromEntries(entries),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
