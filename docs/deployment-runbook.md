# Deployment runbook

## Where it runs

| | |
| --- | --- |
| Host | Cloudflare Pages |
| Production URL | https://vasuambasana.com |
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20 |

`wrangler.jsonc` declares the assets directory. Deploys run through Cloudflare Pages'
own git integration — there is no deploy workflow in `.github/`, and nothing here pushes
to Cloudflare directly.

## Branch model

`dev` is the integration branch. `main` is what's live.

**Never merge `dev` into `main` without the owner's say-so**, even when it fast-forwards
cleanly. Changes get validated on `dev` first.

```bash
git checkout dev
# ... work, commit ...
git push origin dev          # CI runs build-check
# owner reviews on dev, then decides when main gets it
```

## Before you push

```bash
npm run validate   # content integrity
npm run check      # types
npm run build      # the real gate
```

CI (`.github/workflows/build-check.yml`) runs all three on PRs to `main`/`dev` and on
pushes to `dev`. It does **not** deploy.

## Build characteristics

The build takes roughly **6 minutes** locally and produces ~152 pages plus ~500 image
variants. Almost all of that time is sharp encoding WebP from the 127 source photos.

Cloudflare Pages allows 20 minutes, so there's headroom — but not unlimited. If the build
starts approaching the limit:

1. Check nobody added AVIF output (roughly triples encode time).
2. Check no `getImage()` call moved inside a per-page loop in `src/pages/photo/[slug].astro`.
3. Reduce the number of `widths` a component requests before reducing photo count.

`dist/` lands around 90 MB. Cloudflare Pages limits are 25 MB per file and 20,000 files —
both comfortably clear.

## Analytics and headers

Google Analytics (`G-DY8LMP98HR`) and Microsoft Clarity (`y7hw76cv48`) are loaded through
Partytown, so they run in a web worker off the main thread.

The CSP is a `<meta http-equiv>` tag in `src/layouts/BaseLayout.astro` and whitelists
exactly those two vendors. **Adding any third-party script means editing that meta tag**,
or the browser will silently block it.

## Rollback

Cloudflare Pages keeps every deployment. To roll back, promote a previous deployment from
the Pages dashboard — it's instant and doesn't need a git revert. Fix forward on `dev`
afterwards.

## Things that are not automated

- No deploy workflow in this repo; Cloudflare watches the branch itself.
- No smoke tests after deploy.
- No Lighthouse/perf budget enforcement in CI.
- The contact form is `mailto:`-only, so there is no backend to deploy or monitor.
