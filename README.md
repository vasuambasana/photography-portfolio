# Photography Portfolio

Personal photography portfolio for Vasu Ambasana: a static, image-led showcase built with
[Astro](https://astro.build) and deployed to Cloudflare Pages at
[vasuambasana.com](https://vasuambasana.com).

127 photographs, a journal, and no CMS: everything is markdown in the repo.

## Stack

- **Astro 4** (SSG, `output: 'static'`) with Tailwind for styling
- **React** for exactly one island. The lightbox
- **Partytown** to keep analytics off the main thread
- **Astro image pipeline** for responsive WebP with intrinsic dimensions
- TypeScript, strict

## Setup

```bash
npm install
cp .env.example .env    # only needed for the photo-ingest scripts
npm run dev
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Static build into `dist/` (~6 min, generating ~500 image variants) |
| `npm run preview` | Serve the built site |
| `npm run check` | Astro / TypeScript type check |
| `npm run validate` | Content integrity checks |
| `npm run add-photo` | Ingest new photos from `PHOTO_SOURCE_DIR` |
| `npm run backfill-ai` | Regenerate placeholder alt text / descriptions |
| `npm run exif audit` \| `fix` | Report / backfill camera metadata |
| `npm run slugs check` \| `fix` | Report / repair slugs that drifted from titles |
| `npm run optimize` | Shrink oversized source JPEGs |

Run `validate`, `check` and `build` before pushing. CI runs all three.

## Branches

`main` is live. `dev` is where changes get validated first. **Don't merge `dev` into
`main` without the owner's go-ahead.**

## Documentation

- [Content model](docs/content-model.md). The two collections, their fields, and why
  `order` is a pin rather than a sort key
- [Image workflow](docs/image-workflow.md). From RAW on disk to responsive `<picture>`
- [Deployment runbook](docs/deployment-runbook.md). Cloudflare setup, build budget, rollback

[`CLAUDE.md`](CLAUDE.md) holds the conventions that are easy to rediscover the hard way.
