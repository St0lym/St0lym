# assets/ — visual system

The direction art for **St0lym/St0lym** lives here, not in the Markdown.
GitHub renders PNG, JPEG, GIF and **SVG** inline, so structural pieces
(diagrams, marks, cards) ship as hand-authored SVG and the photographic
hero/footer ship as raster.

## Folder map

| Folder | Holds | Format | Status |
|--------|-------|--------|--------|
| `illustrations/` | hero (light/dark/mobile), avatar, capabilities | **WebP** | ✅ live raster art |
| `illustrations/scenes/` | cinematic art per featured system | WebP | ✅ used in README |
| `illustrations/logos/` | serif brand logos (Stakon … Node) | WebP | 🗂️ available (white bg — light mode) |
| `diagrams/` | radar, node map, workflow, stack, focus | SVG | ✅ final |
| `sections/` | section dividers, footer horizon | SVG | ✅ final |
| `hero/` `identity/` `projects/` | original hand-authored SVG placeholders | SVG | 💤 superseded by `illustrations/`, kept as fallback |
| `generated/` | live stats snapshots | SVG (CI-written) | ⚙️ produced by Action |

> Raster art is sourced from `external/` (raw generations, git-ignored) and
> converted to WebP with ffmpeg: photographic frames lossy q84–86, flat logos
> lossless. Budgets honoured — hero ≈ 80–105 KB, avatar 35 KB, scenes ≤ 90 KB.

## Conventions

- **Palette** — white `#ffffff`, off-white `#f4f9ff`, pale blue `#eaf2ff`,
  sky `#cfe3ff`, accent `#1f6feb` / `#3b82f6`, cyan hint `#38bdf8`,
  ink `#0d1b2e`, steel text `#46566b`. Dark: bg `#0b1220`, accent `#60a5fa`.
- **Dimensions** — hero `1600×520`, mobile `800×600`, project card `560×300`,
  section strip `1600×120–240`, mark `120×120`, avatar `200×200`.
- **Light/dark** — anything in the hero ships in both variants and is wired
  through a `<picture>` element in the root README.

## Upgrading the hero to generated artwork

The hero is currently a premium SVG placeholder so the profile reads cleanly
**today**. To swap in anime-style generated artwork:

1. Generate the banner (soft editorial anime / airy blue — Style A, fused with
   the system-design rigor of Style B). Target `1600×520`, calm and breathable.
2. Export `hero-light.webp` and `hero-dark.webp` (+ `hero-mobile.webp`) here.
3. In the root `README.md`, change the hero `srcset`/`src` extensions from
   `.svg` to `.webp`. Nothing else changes — the `<picture>` markup is ready.

> Keep raster light: WebP, < 250 KB each. The SVGs stay as fallback.
