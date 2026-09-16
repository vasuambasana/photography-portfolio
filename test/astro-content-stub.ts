// `src/utils/journal.ts` imports getEntry from 'astro:content' for decorate(), which only
// runs during a build. The pure helpers around it are what the tests exercise, so this
// stub just satisfies the import.
export function getEntry(): never {
  throw new Error('getEntry is not available under test — stub it in the test that needs it.');
}

export function getEntries(): never {
  throw new Error('getEntries is not available under test — stub it in the test that needs it.');
}
