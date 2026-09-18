---
description: Redesign one page in two directions, built and screenshotted before you choose
argument-hint: "<page path, e.g. src/pages/gallery/index.astro>"
---

Redesign $ARGUMENTS.

**Load the `design-system` skill first.** Everything below has to stay inside it. The
point of a revamp is that the site ends up more coherent, not that one page ends up
different from the rest.

1. **Read the page and everything it renders** before proposing anything. Note which parts
   are shared components (`PhotoCard`, `JournalCard`, `BaseLayout`). Changing those
   changes other pages too, and that's usually a feature, but say so explicitly.

2. **Propose two genuinely distinct directions**, not one idea at two opacities. One line
   each on what it optimises for and what it gives up.

3. **Build each one.** If the browser MCP is available, screenshot at 390 / 768 / 1440 in
   **both light and dark**. If it isn't, say so plainly rather than describing what you
   imagine it looks like, and fall back to `npm run build` plus a careful read of the
   generated markup.

4. **Check the things a screenshot won't show you:**
   - photographs keep their native aspect ratio, uncropped
   - every collection photo goes through `<Image>` with an explicit `width`
   - focus states are visible, touch targets ≥ 44×44
   - the build didn't grow a pile of new image variants

5. **Show me both and stop.** Don't pick for me, don't commit, and don't touch `main`.

If the change is large enough to be worth seeing before it's built, use the `design` skill
to mock artboards first. That's cheaper than implementing two directions in code.
