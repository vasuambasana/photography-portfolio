// What this visitor has seen, kept in their own browser and never sent anywhere.
//
//   seen   the photographs they have opened (a photo page, or the lightbox)
//   known  every photograph that existed at their last visit, so a later visit can
//          tell them what is new. "New" is worked out once per browser session and
//          held for the rest of it, so it doesn't vanish on the next page.
//
// Every read and write is guarded: private windows and blocked storage just mean
// nothing is remembered.

const SEEN = 'seen';
const KNOWN = 'known';
const FRESH = 'fresh';

function read(store: Storage | undefined, key: string): string[] | null {
  try {
    const raw = store?.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : null;
  } catch {
    return null;
  }
}

function write(store: Storage | undefined, key: string, value: string[]) {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do: the visitor just won't be remembered.
  }
}

const local = () => (typeof localStorage === 'undefined' ? undefined : localStorage);
const session = () => (typeof sessionStorage === 'undefined' ? undefined : sessionStorage);

export function seenSlugs(): Set<string> {
  return new Set(read(local(), SEEN) ?? []);
}

export function markSeen(slug: string) {
  const seen = seenSlugs();
  if (seen.has(slug)) return;
  seen.add(slug);
  write(local(), SEEN, [...seen]);
}

/**
 * Photographs added since this visitor's last visit. The first visit ever has nothing
 * "new" (everything would be), so it only records what exists.
 */
export function freshSlugs(all: string[]): Set<string> {
  const held = read(session(), FRESH);
  if (held) return new Set(held);

  const known = read(local(), KNOWN);
  const fresh = known ? all.filter((slug) => !known.includes(slug)) : [];
  write(local(), KNOWN, all);
  write(session(), FRESH, fresh);
  return new Set(fresh);
}

export function forgetSeen() {
  try {
    local()?.removeItem(SEEN);
    local()?.removeItem(KNOWN);
    session()?.removeItem(FRESH);
  } catch {
    // Already as forgotten as it can be.
  }
}
