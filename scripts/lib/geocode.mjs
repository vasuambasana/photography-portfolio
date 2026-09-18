/**
 * GPS -> place name.
 *
 * Coordinates are read from the *original* file and never written to the site. Only a
 * coarse, human place name ends up in frontmatter, and sharp strips metadata when it
 * re-encodes, so the published JPEGs carry no location at all. That matters: exact
 * coordinates of where someone stands are sensitive in a way "Death Valley" is not.
 *
 * Reverse geocoding uses Nominatim (OpenStreetMap), which is free and keyless but asks
 * for a real User-Agent and at most one request per second. Set GEOCODE=off to skip.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'vasuambasana-portfolio-ingest/1.0 (+https://vasuambasana.com)';
const MIN_INTERVAL_MS = 1100;

let lastRequest = 0;

export async function extractGps(filePath) {
  try {
    const exifr = await import('exifr');
    const gps = await exifr.default.gps(filePath);
    if (!gps || typeof gps.latitude !== 'number' || Number.isNaN(gps.latitude)) return null;
    return { latitude: gps.latitude, longitude: gps.longitude };
  } catch {
    return null;
  }
}

/** Builds "Town, State" / "Park, State". Deliberately coarser than the raw fix. */
function formatPlace(address) {
  if (!address) return null;

  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.national_park ||
    address.protected_area ||
    address.county;

  const region = address.state || address.province || address.region;
  const country = address.country;

  const parts = [locality, region].filter(Boolean);
  if (parts.length === 0 && country) return country;
  if (country && country !== 'United States' && parts.length < 2) parts.push(country);

  return parts.length ? parts.join(', ') : null;
}

export async function reverseGeocode(latitude, longitude) {
  if (process.env.GEOCODE === 'off') return null;

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();

  const url = `${NOMINATIM}?format=jsonv2&zoom=12&lat=${latitude}&lon=${longitude}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      console.warn(`   geocode failed (${res.status})`);
      return null;
    }
    const data = await res.json();
    return formatPlace(data.address);
  } catch (err) {
    console.warn(`   geocode error: ${err.message}`);
    return null;
  }
}

/** Convenience: file -> place name, or null when there's no GPS to work from. */
export async function locationFromExif(filePath) {
  const gps = await extractGps(filePath);
  if (!gps) return null;
  return reverseGeocode(gps.latitude, gps.longitude);
}
