# CLAUDE.md — Nusantara Languages

Language map of Indonesia: family-coloured speaker areas from Glottolog and Glottography, with the genealogical tree rendered beside the map and bound to it. Static site, GitHub Pages, no backend, no runtime network.

Read `PRD.md` before starting any task — **§3 and §4 in particular**. It fixes scope; this file describes how to work in the repo.

**Four things shape everything:**

1. **The linkage is the product.** Map and tree bound bidirectionally. A coloured map alone is not this project; if the binding doesn't work, nothing else matters.
2. **Never use Ethnologue.** Proprietary, in every field, for any purpose — including speaker counts. A test asserts no Ethnologue-derived field exists in the bundle. Ship without counts rather than with borrowed ones.
3. **This is a 1980s atlas, not a census.** Wurm & Hattori describes where languages were documented, not who speaks what today. The period is stated on the plate itself.
4. **Points stay points.** Glottolog coordinates are often midpoints of dispersed populations. Never inflate one into a territory — no convex hulls, no default Voronoi.

---

## Stack

- Next.js 14, App Router, `output: 'export'` — static only
- TypeScript, `strict: true`
- Tailwind CSS
- Zod for source manifest validation
- Vitest
- pnpm
- **No mapping library with a tile dependency, no Newick parser, no topology library.** The tree parser and the plate are the project.
- Fonts via `next/font`, self-hosted.

## Commands

```bash
pnpm dev
pnpm build                  # static export to ./out; runs sources:validate first
pnpm preview                # serve ./out under the production basePath
pnpm test                   # vitest watch
pnpm test:run               # vitest once — before every commit
pnpm test:integrity         # glottocode resolution, tree acyclicity, ancestry chains
pnpm test:licence           # no Ethnologue-derived fields; manifest completeness
pnpm sources:fetch          # DEV/CI — pull Glottolog + Glottography releases
pnpm sources:build          # filter to Indonesia, simplify, emit bundle + coverage report
pnpm sources:validate       # licence gate, version pinning, referential integrity
pnpm bench:plate            # vertex count + hover latency against budget
pnpm typecheck
pnpm lint
```

`pnpm sources:validate` and `pnpm test:licence` gate the build and CI.

## Layout

```
app/
  [locale]/                 # id (default), en
    peta/                   # the plate + tree
    bahasa/[glottocode]/    # language panel
    pandu/                  # guided views
    metode/                 # sources, coverage, what the map does not claim
components/
  plate/                    # atlas plate, polygons, points, legend, index panel
  tree/                     # Newick rendering, scroll-to, expand ancestry
  panel/                    # language detail
lib/
  newick/                   # parser. Pure.
  tree/                     # ancestors, descendants, subtree. Pure.
  geo/                      # simplification, projection, hit-test index. Pure.
  colour/                   # stable family → colour assignment
  sources/
    manifest.ts             # licence declarations + gate
scripts/
  build-sources.ts          # DEV/CI — fetch, filter, simplify, emit, report coverage
data/
  bundle/                   # emitted languoids, tree, geometry, coverage.json, manifest
tests/
  integrity/
  tree/
  licence/
```

## Invariants

1. **`lib/newick`, `lib/tree`, and `lib/geo` are pure.** No DOM, no React, no clock, no network, no module-level mutable state. Testable in Node.

2. **No Ethnologue-derived data, anywhere.** Not speaker counts, not EGIDS status, not alternate names sourced from it. `pnpm test:licence` asserts the bundle carries no field traceable to it. If a number is only available from Ethnologue, the field is omitted and the omission is stated on the page.

3. **Every source declares licence and version in the manifest.** The build refuses an unresolved licence. **The Glottography GeoJSON licence must be verified before it ships** — until then the project falls back to a point map.

4. **Attribution is structural, not decorative.** Glottolog is CC-BY-SA. Attribution appears on the plate, in every PNG export, and in the repository. It is not a footer component that can be removed by a layout change. Derived bundles are published under the same terms.

5. **Points are never inflated into territories.** A language without a polygon renders as a point, visually distinct and labelled as such. No convex hulls, no Voronoi in the default path. If a Voronoi approximation is ever added it is off by default and labelled an approximation in the UI.

5a. **The coastline is sourced, never derived.** The plate draws land from Natural Earth (public domain, pinned) so that a gap in coverage reads as "unrecorded" rather than as sea. Do **not** replace it with a silhouette traced from the language areas: that would draw a country that stops where the documentation stops, which is the same error as inflating a point. Land carries no glottocode, sits in its own list in the plate model, and is `pointer-events-none` — it must stay structurally incapable of being hovered, selected, searched or announced.

6. **The atlas period is stated on the plate**, not only in the method page. The map shows where languages were described in an early-1980s atlas.

7. **The coverage report is generated by the pipeline**, not written by hand. `coverage.json` is emitted from the actual bundle and the page reads it. It cannot drift from reality.

8. **Language level only.** Glottolog dialects are excluded from v1 — the tree becomes unmanageable and the polygons do not exist.

9. **Family colours are assigned stably** from a curated muted set in `lib/colour`. **Never generate from a rainbow ramp, never assign by index order** — the same family must get the same colour across builds, or the map's memory value is destroyed. The set is placed in OKLCH and scored against normal vision plus three colour-vision deficiencies; `tests/colour/vision.test.ts` fails on a confusable pair. Read the header of `lib/colour/palette.ts` before touching a value: lightness is a deliberate second channel (CVD collapses hue), the hue spacing is uneven on purpose, and the selected inks are chroma-capped because chasing maximum chroma produces neon.

10. **Saturation is reserved for selection.** Base state is muted; the selected family is the only saturated object on the plate. Do not raise base saturation for "visual impact" — the contrast *is* the interaction.

10a. **The plate can be read at two levels, and subgroup colour means something different from family colour.** At family level a colour names a family. At subgroup level it only distinguishes *neighbours* — tints repeat across the archipelago on purpose, because the first real branching of Austronesian gives 25 subgroups and no palette can name that many. The UI must keep saying so. Two rules hold it together: a subgroup only ever draws from its family's band of neighbouring hues (so Austronesian stays warm, the Papuan families stay cool, and the seam survives), and adjacent subgroups take different tints. `tests/colour/subgroup.test.ts` asserts both, including that no Austronesian subgroup can drift onto a cool tint.

11. **Endangerment is hatching, never hue.** Colour carries family; the two layers must compose, not compete.

12. **Rendering stays within the vertex and latency budget.** `bench:plate` gates it. SVG while the budget allows; canvas with an offscreen colour-index hit-test past it. A plate that stutters on hover destroys the linkage.

13. **Raw worldwide dumps are never committed.** The pipeline emits a filtered, simplified bundle; that is what ships.

14. **Zero network requests at runtime.** No tiles, no font CDN, no analytics.

15. **Nothing is computed in a component.**

## Working style

- **Measure the render budget at M0.** Before any styling, before the tree. If hover latency on the full polygon set is bad, the architecture changes, and that is a week-one discovery.
- **Verify the polygon licence before building on it.** The fallback — a point map — is a materially different product and you need to know which one you are building.
- **Build the linkage at M2, before layers and guided views.** A coloured map without the tree binding is not the project.
- **When a language has no polygon, show it as a point and move on.** Do not invent geometry to make the map look complete. The coverage number tells the truth.
- **Never assert a speaker count without a citation.** Omission is honest; a borrowed number is a licence problem and a factual one.
- **Small increments.** One family fully rendered and linked beats all of them half-wired.
- **Don't touch `next.config.js`, the Actions workflow, `sources:validate`, or the licence manifest without saying so explicitly.**
- **Don't add a mapping, Newick, or topology dependency.**
- **Never weaken a test or the validator to make something pass**, especially `test:licence`.

## Conventions

- Named exports; defaults only where Next requires them.
- Discriminated unions for languoid kinds, geometry kinds (`polygon` | `point`), and results, keyed on `type`. Exhaustive `switch` with a `never` default.
- No `any`. No non-null `!` in `lib/`.
- **Glottocode is the identity everywhere** — in routes, keys, links, and the manifest. Never key on name; names are ambiguous and change.
- Follow Glottolog's vocabulary in identifiers: `languoid`, `glottocode`, `family`, `subgroup`, `isolate`, `aes` for endangerment status.
- Coordinates as `[lon, lat]` in WGS 84, named `*Lon` and `*Lat`. Never swap the order silently at a boundary.
- Comments cite the Glottolog release version or the atlas edition any figure comes from.
- Indonesian first in UI copy; family names in standard scholarly form.
- Tabular numerals on counts and coverage figures.
- Tailwind utilities inline; semantic tokens in `tailwind.config.ts` — `plate`, `boundary`, `sea`, `index`, `index-deep`, `ink-soft`, `accent`, plus the curated `family-*` set. Never raw hex in components: family colours reach the DOM as `var(--family-*)` from `PaletteVars`.
- **Type by role, not by size.** The scale is `micro`, `label`, `body-s`, `body`, `lead`, `title-s`…`title-xl`. Never pick a heading size for how big it looks.
- **Use the component layer** in `globals.css` rather than reassembling it: `sheet` / `sheet-quiet` for the paper washes, `btn` / `btn-primary`, `field`, `link`, `caveat`, `figure`, `index-label`, `rule` / `rule-double`.
- **The accent red is rationed** — primary action, current page, selection, focus ring. Nothing else. It is also the only colour that must never read as data, which a test asserts.

## Testing rules

- `pnpm test:run` before every commit; `pnpm test:integrity` and `pnpm test:licence` before any commit touching the pipeline, the manifest, or `lib/tree`.
- Referential integrity: every polygon resolves to a glottocode in the languoid table; every ancestry chain terminates at a root family; no cycles.
- Tree queries asserted against fixtures from a deep, well-documented subgrouping — Malayo-Polynesian is a good one because the nesting is real and checkable.
- Licence test asserts no Ethnologue-derived field in the bundle, and that every source in the manifest has a resolved licence and pinned version.
- Coverage figures asserted to match the emitted bundle, not a hardcoded value.
- Colour assignment asserted stable across two consecutive builds of the same sources.
- Determinism: same source versions produce a byte-identical bundle.
- Render budget asserted by `bench:plate`.
- Bug fix → failing test first.

## Deployment

`main` builds and deploys via Actions; licence gate and coverage generation gate it. `basePath` must match the repository name; `.nojekyll` must exist in `out/`. Geometry ships as a separate chunk. Verify with `pnpm preview` before pushing.

## Framing

The site states plainly that it is a personal project, that the distribution shown reflects an early-1980s atlas rather than a current census, that boundaries between languages are gradients rather than lines, and how many languages have territories versus points. Glottolog and the atlas are attributed on the plate and in exports as CC-BY-SA requires. The project is not named "Peta Bahasa" and carries no government or OIKN branding — Badan Bahasa has an official product under that name and the resemblance would mislead.

## Current state

**M0–M5 shipped.** Live at <https://andifathulms.github.io/nusantara-languages/>, deployed from `main` by Actions with the licence gate, the tests, `bench:plate` and a source-reproducibility check gating it.

**The polygon licence question is resolved, and the answer changed the source list.** The Wurm & Hattori Glottography dataset (`Glottography/wurm1981pacific`) is **CC-BY-NC-4.0**. The non-commercial restriction cannot be carried into the CC-BY-SA-4.0 derived bundle, so it is recorded in the manifest as `decision: 'refused'` with its reason and published on the method page. Polygons come from two CC-BY-4.0 Glottography datasets instead: `asher2007world` (Asher & Moseley 2007) and `schapper2020papuan`.

**Consequence for the copy: this is no longer a 1980s atlas.** The period is 1990–2020, derived from the manifest rather than hardcoded, and invariant 6 should be read as "the atlas period is stated on the plate, whatever the bundled sources say it is". If Wurm & Hattori ever becomes redistributable, adding it back is a manifest change plus a rebuild.

The bundle: 726 languages, 421 with speaker areas (58%), 305 points only, 23 isolates, 56 top-level units, 19,570 vertices. Every one of those figures is read from `coverage.json`.

`bench:plate` cleared at M0 with room to spare — 19,570 vertices against 60,000, hover p95 0.01 ms against 2 ms — so the plate is SVG and the canvas colour-index path was never needed.

### The design pass (2026-08-13)

The palette was rebuilt from measurement, a type scale and component layer replaced the ad-hoc
utilities, and a comprehension layer was added for readers who have never met the phrase
"language family": a plain lead, a key made of real specimens rather than descriptions, three
worked examples that perform the interaction, and the selection stated in words. The tree
becomes a tab below `lg`. The front page shows a still of the plate built from the same model.

Colour-vision deficiency is now checked, so PRD §13's request is discharged: confusable pairs
fell from 15 to 0 in normal vision and from 48 to 2 under deuteranopia.

### The coastline (2026-08-13)

Added at the user's request after seeing the plate: without land, every island was clipped to
whatever the polygon sources covered and the archipelago looked eaten away. This reverses the
earlier "no coastline" decision — the reasoning behind that decision is preserved in invariant
5a, because it still governs *how* the coastline may be obtained.

Natural Earth 1:10m, `public-domain`, entering as a third source role (`basemap`). 14,747
vertices after ring-clipping to the frame and simplifying at 0.01°; the whole plate now draws
34,317 of the 60,000 budget, and hover is unaffected because the land is never hit-tested.

### Subgroup colouring (2026-08-13)

Austronesian was two-thirds of the map in one tint. The plate now reads at two levels; see
invariant 10a for what subgroup colour does and does not claim. Tints within a region went from
1 to 4 in Sumatra, 1 to 3 in Kalimantan, 1 to 5 in Sulawesi.

Pan, zoom and full screen landed alongside it (`lib/plate/viewport`, pure, 19 tests). The plate's
viewBox never changes — a transform moves a group inside it — which is what keeps the attribution
pinned, hover hit-testing free, and the PNG export correct at any zoom.

### Brand assets (2026-08-13)

An asset pack arrived as a working folder (`exports/`, gitignored — four tile variants and
nine icon sizes, most of which the site never asks for). The files the browser actually
requests are copied into `app/` and `public/brand/` and committed there; `exports/` is the
source of truth for the identity but is not what ships.

Two Next behaviours cost a build each and are worth not rediscovering: the `app/manifest.ts`
route convention hardcodes its `<link>` at the origin root and ignores `basePath`, so the
manifest is a static `public/manifest.webmanifest` with `metadata.manifest` pointing at it;
and declaring *any* entry in `metadata.icons` replaces the auto-detected file-convention set
wholesale, which silently dropped `icon.svg` until both were stated explicitly. Both were
caught by reading the exported HTML, never by the build or the type checker.
`tests/site/brand.test.ts` holds the manifest, the basePath and the icon files in agreement.

**Brand inks live in `lib/colour/brand.ts`, never in the family palette.** The mark's three
leaves (maroon, teal, violet) are a fixed signature; a test asserts they never collide with a
family colour, because a signature ink that reads as data is a failure nobody would notice.
The masthead still leads with the wordmark — the mark is set small beside it, inline SVG so
invariant 14 holds.

### Reading the binding backwards (2026-08-13)

Three additions, all of which answer a question the app implied and could not answer. The
common shape: the linkage already bound descent to geography in one direction — pick a
branch, see its territory — and each of these reads it the other way.

- **Nearest relatives** (`lib/tree/relatives`, on the language page). The group is genealogy
  and is *unranked* — Glottolog carries no branch lengths — while the closest recorded point
  is geography and is stated separately, so nearness on the map is never read as nearness in
  the family. Scoped to the bundle, so the copy says "on this map", never "in the world".
- **Branch extent** (`extentKm` on `TreeRow`). Austronesian spans 5,010 km here,
  Timor-Alor-Pantar 350. Without it the map implies every colour names a thing of the same
  size, which is its most misleading impression.
- **Seam contacts** (`lib/geo/adjacency`, `lib/plate/seam`). 67 touching pairs, 74 languages,
  18 families. The guided view drew a line; the data says Halmahera is interleaved.

**Every one of these prints a number, so every one publishes its rule and its limit next to
it** — the 2 km threshold against the 0.01° simplification, the midpoint caveat on both
distances, and the floor on contacts (only polygon-bearing languages can appear). A figure a
reader cannot trace to a rule is the thing this project does not ship, and a tooltip is a
good way to let them miss the rule — so these render as visible caveats.

Adjacency is the one piece here that makes a stronger claim than anything else in the
codebase. Two bugs were caught by fixtures rather than by the data: vertex-to-segment
sampling misses edges that *cross*, and containment shares no boundary at all. It is
segment-to-segment with a point-in-polygon pre-check, ring-culled to 238 ms.

### Next, in rough order

1. **Look at it on a real screen.** Still the top item, and now more so: the interface has been
   verified structurally and numerically, never visually. No headless browser was available.
   Worth checking specifically — pale tints (blush, wedgwood, olive at L 0.82) against the
   paper, the density of the tree column at 12px, and whether the accent red feels rationed or
   scarce.
2. **Trim the page payload**, now the more pressing of the two. The plate page is ~440 KB
   gzipped with the land layer; the front page is ~180 KB. `LanguageDetail.ancestry` repeats
   ancestor *names* per language (~150 KB raw) when the tree rows carry them, shapes/rows carry
   two CSS variable strings each where a token would do (~60 KB), and the land is serialised
   twice — once as SSR markup, once in the flight payload. Rendering the land from a single
   `<use>`-able definition, or moving it out of the RSC payload, would be the biggest single win.

3. ~~**Austronesian is 64% of the map.**~~ Done: the colour-by control reads the plate at family
   or subgroup level. `informativeCut` in `lib/tree` finds the level to cut at — depth is the
   wrong instrument, because every Austronesian language here is Malayo-Polynesian and a fixed
   depth of 1 reproduces the same wall.
3. **A dark variant, maybe not.** The plate is paper. A dark mode would be a second design, not
   a colour swap, and the atlas conceit does not obviously survive it.
4. **Dialects, if ever.** Still out of scope, and the reasons in §5 have not changed.
