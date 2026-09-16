---
description: Scaffold a journal entry with references verified against the real collection
argument-hint: "<topic or title>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm run validate)
---

Scaffold a new journal entry about: $ARGUMENTS

1. **Pick the cover and related photos from the actual collection.** Grep
   `src/content/photos/` for candidates — match on `category`, `location`, `date`, and what
   the descriptions actually say. `coverImage` and `relatedPhotos` are
   `reference('photos')`, so they take **photo slugs** (the markdown filename without
   `.md`), not paths. A slug you invented will fail the build.

2. **Write the frontmatter.** See `src/CLAUDE.md` for the schema. Note what does
   *not* exist: no `readingTime` (computed), no `coverAlt` (taken from the cover photo).

3. **Reuse existing tags** where they fit — check what's already in use across
   `src/content/journal/`. A near-duplicate tag (`new-england` vs `newengland`) splits a
   tag page in two.

4. **Write the body in the house voice**: first person, concrete, understated. Specific
   details — the temperature, the time on the clock, what went wrong — carry the piece.
   Never invent an award, client, exhibition, publication or credential. If a fact is
   needed and unknown, write `[PLACEHOLDER: ...]` and tell me.

5. Run `npm run validate` to confirm every reference resolves, then show me the draft.
   Don't commit.
