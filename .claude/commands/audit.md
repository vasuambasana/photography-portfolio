---
description: Full health check: content, types, build, and output weight
allowed-tools: Bash(npm run validate), Bash(npm run check), Bash(npm run build), Bash(node scripts/*), Bash(find:*), Bash(du:*), Bash(ls:*), Bash(grep:*), Read, Glob, Grep
---

Run the full check and report what's actually wrong. $ARGUMENTS

1. `npm run validate`: content integrity.
2. `npm run check`: types.
3. `npm run build`: the real gate. Note how long it takes; the Cloudflare Pages ceiling
   is 20 minutes and a cold build is around 6.
4. Inspect `dist/`:
   - total size and file count
   - the ten largest files
   - any `.jpg`/`.png` in `dist/_astro/` that is a full-size original rather than a
     generated variant. That means an `<Image>` somewhere is missing an explicit `width`,
     or a bare `<img>` is pointing at a collection photo
   - spot-check one gallery `<img>`: it must have `srcset`, `sizes`, and `width`/`height`
5. Report the placeholder-alt-text count from `validate`, and whether it moved since last time.

Then give me a short prioritised list: what's broken, what's degrading, what's fine.
Don't fix anything unless I ask; this is a read-only audit.
