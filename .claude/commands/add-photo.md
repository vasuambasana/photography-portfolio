---
description: Ingest new photos end to end, then review the AI-written copy
argument-hint: "[path] [--category <cat>] [--location <place>] [--featured]"
allowed-tools: Bash(npm run add-photo:*), Bash(node scripts/*), Bash(npm run validate), Read, Edit, Glob, Grep
---

Ingest photos with `npm run add-photo -- $ARGUMENTS`. With no path it reads
`PHOTO_SOURCE_DIR` from `.env`.

Then, before anything is committed:

1. **Read every generated markdown file.** The ingest calls Gemini for title, alt text and
   description, and degrades to placeholders rather than failing, so assume nothing landed
   until you've looked.

2. **Check the copy against the house voice** (see `src/CLAUDE.md`): first person,
   understated, concrete. Rewrite anything that drifts into "testament to", "invites the
   viewer", "serves as a reminder", three-adjective stacks, or sentences that just describe
   what is obviously in the frame.

3. **Check the alt text is real.** `alt: "A street photograph"` is the fallback, not alt
   text. It's the category with an article in front. Alt text describes what is visible,
   for someone who cannot see it. Rewrite it from the image.

4. **Verify EXIF landed.** If `cameraSpecs` is empty or partial, say so plainly. Never
   invent aperture, shutter, ISO or focal length. If the originals are still on disk,
   `npm run exif fix` can backfill from them.

5. **Get a location for every new photo, from a real source.** The ingest fills it from GPS,
   then `--location`, then other photos already placed on the same capture date. Whatever is
   still empty, it lists at the end with a `npm run locate set` command per shoot. **Ask the
   user where those shoots were** and run the commands with their answers. If they don't
   know, leave it empty. Never fill it from what the picture looks like.

6. Run `npm run validate`.

7. **Show the frontmatter and description for each new photo and stop.** Don't commit.
   The user reviews first.
