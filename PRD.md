# PRD — Nusantara Languages

**Seven hundred languages, coloured by family, with the family tree beside the map and the two linked. Hover a branch, watch its territories light up.**

| | |
|---|---|
| **Status** | M0–M5 shipped — [live](https://andifathulms.github.io/nusantara-languages/). See CLAUDE.md § Current state for what the licence gate changed. |
| **Owner** | Andi Fathul Mukminin Salahuddin |
| **Type** | Personal portfolio project, open source, educational |
| **Deployment** | GitHub Pages (static export, no server, no runtime network) |
| **Language** | Indonesian-first UI; English secondary |
| **Primary data** | Glottolog (CC-BY-4.0) + Glottography speaker-area polygons (CC-BY-4.0) |

*Name: explanatory, as asked. Alternative: **Language Atlas**. Deliberately **not** "Peta Bahasa" — that is the name of Badan Bahasa's official product, and the resemblance would imply government affiliation. Same reasoning that keeps OIKN branding off everything here.*

---

## 1. Why this

Indonesia has one of the most linguistically dense territories on earth, and almost no Indonesian has seen their own linguistic geography laid out. School teaches that there are "many regional languages". It does not teach that the boundary between the Austronesian and Papuan families runs through Halmahera, or that the language you speak at home belongs to a family that reached these islands by sea.

The region is also, visually, one of the most dramatic anywhere. Austronesian sweeps west to east across the archipelago; the Papuan families sit in the east; and the seam between them is visible on a map. **Colour by family and the structure appears with no design effort — the data is the picture.**

## 2. The differentiator

Language maps exist. Family trees exist. **Nobody links them.**

Glottolog publishes the full genealogical classification as a Newick tree. Render it beside the map and bind the two: hover a branch and every territory in that subgroup lights; click a territory and the tree scrolls to its position and expands its ancestry. Genealogy and geography become one object.

That is cheap given the data and it is the reason to build this rather than yet another coloured map.

## 3. Data

**Glottolog is the spine, and it is CC-BY-SA** — share-alike, not plain attribution. Any derived dataset published from this inherits the same terms. Worth stating up front because it constrains what can be redistributed.

| Need | Source | Notes |
|---|---|---|
| Languoid catalogue, names, ISO codes, family classification | Glottolog | ~576 KB zipped worldwide |
| Point coordinates | Glottolog `languages_and_dialects_geo.csv` | 1.0 MB worldwide |
| Genealogical tree | Glottolog Newick export | ~754 KB worldwide |
| Endangerment status | Glottolog AES | Composes as a second layer |
| **Speaker-area polygons** | Glottography / Wurm & Hattori revised digital edition | GeoJSON, linked to Glottolog by glottocode |

**Polygons are the thing that makes it beautiful, and they exist.** A revised digital edition of Wurm & Hattori's *Language Atlas of the Pacific Area* was published in *Scientific Data* as GeoJSON with every area linked to a Glottolog languoid, and the Glottography project publishes these as CLDF datasets with aggregated language-level and family-level speaker areas. Wurm & Hattori is the classic atlas for island Southeast Asia; Indonesia is covered thoroughly.

**Verify the GeoJSON licence before bundling.** *Scientific Data* is open access and it is very likely CC-BY, but that is exactly the assumption that has cost this project family twice already. Licence gate at M0.

> **Resolved at M0, and the assumption was wrong.** The Glottography release of Wurm & Hattori is **CC-BY-NC-4.0**, which cannot be carried into a CC-BY-SA-4.0 derived bundle. It is refused by the gate and the refusal is published on the method page. Polygons come from `asher2007world` and `schapper2020papuan` instead, both CC-BY-4.0 — so the map kept its territories, but the period is 1990–2020 rather than the early 1980s, and the plate says so. Glottolog itself declares CC-BY-4.0, not CC-BY-SA as assumed above; the derived bundle is still published under CC-BY-SA-4.0.

**Speaker counts are the weak spot.** Glottolog does not carry reliable population figures. **Ethnologue does and is proprietary — do not use it, at any point, for any field.** Badan Bahasa publishes verified Indonesian counts; use them if their terms permit, and if not, ship without speaker numbers and say so. A map without counts is honest; a map with borrowed counts is a licence problem.

**Payload is trivial.** Filtered to Indonesia and simplified, everything fits comfortably in a static bundle.

## 4. What the map must not pretend

Three honesty constraints, each of which most language maps get wrong.

**It is a historical snapshot.** Wurm & Hattori is early 1980s. Urbanisation, migration, and the spread of Indonesian as lingua franca have shifted things since. **The map is labelled with the atlas period, prominently** — it shows where languages were described, not a census of who speaks what today.

**Point coordinates are midpoints, not locations.** Glottolog's coordinate is often chosen as a midpoint where speaker populations are spread out or disjoint. A language shown as a point is shown as a point — never inflated into a territory, never Voronoi-filled by default. Where a polygon is missing, the marker says so.

**Language boundaries are gradients, not lines.** Dialect continua are the norm, not the exception; a crisp polygon edge asserts a sharpness that rarely exists. The rendering acknowledges this — boundaries are drawn as hairlines rather than hard walls, and the method page states it plainly.

**Coverage is published, not hidden.** How many Indonesian languages have polygons versus points only, as a number on the page. If two-thirds are points, the map says two-thirds are points.

## 5. Non-goals

- **No Ethnologue data**, in any field, ever. Proprietary.
- **No dialect-level mapping in v1.** Glottolog has dialects; the tree gets vast and the polygons don't exist. Language level only.
- **No speaker-count estimation or interpolation.** Either sourced and cited, or absent.
- **No language learning content, no phrasebooks, no audio.** A different project.
- **No claims about which language is "correct" or which dialect is "standard".**
- **No accounts, no server, no runtime network.**
- **No ML.**

## 6. Features

### 6.1 The plate — signature view
Indonesia rendered as an atlas plate: flat family colours, hairline boundaries, sea in pale wash. Languages without polygons appear as marked points, visibly a different kind of thing.

Selecting a family saturates it and desaturates everything else, so a single family's reach across the archipelago reads instantly.

### 6.2 The tree — the linkage
The Glottolog classification rendered beside the map. **Bound bidirectionally:** hovering a branch lights its territories; clicking a territory scrolls the tree to that language and expands its ancestry from root family down.

This is the feature. It should be working at M2 and nothing should ship before it.

### 6.3 Endangerment as hatching
Endangerment status rendered as **hatch density over the family colour**, not as a competing hue. Colour already carries family; hatching composes with it instead of fighting it, so both layers are readable at once.

### 6.4 The language panel
Names and alternates, glottocode, full family path, endangerment status, coordinates, whether a polygon exists, and every source with its citation. One tap from any territory or point.

### 6.5 Guided views
Short, curated entries into the data:

- **The Austronesian–Papuan seam** — the region's headline fact, made visible.
- **Isolates** — languages with no known relatives, highlighted. Rare, fascinating, and a good hook.
- **Most endangered** — filtered to the categories nearest extinction.

### 6.6 Search
By name, alternate name, glottocode, or ISO code. Jumps the map and the tree together.

### 6.7 Export and share
PNG of the current view with attribution baked in — required by the licence and also the distribution mechanism. State encodes into the URL hash.

### 6.8 Method and coverage page
Sources, versions, licences, atlas period, polygon coverage figures, and what the map does not claim. Linked from the plate, not buried.

## 7. Architecture

Static Next.js 14 App Router export. No backend, no runtime network.

```
Glottolog + Glottography (build time)
  → licence gate
  → filter to Indonesia, simplify polygons, project
  → compact bundle: languoids, tree, geometry, coverage report
  → plate | tree | panel
```

**Build-time pipeline, committed output.** A dev/CI script fetches, filters, simplifies, and emits. Raw worldwide dumps are never committed.

**`lib/tree` is pure.** Newick parsing, ancestor and descendant queries, subtree selection. No DOM, no React. It is what the linkage runs on and it is trivially testable.

**Rendering budget decides SVG versus canvas.** Simplified polygons with a stated vertex budget render as SVG, which makes hover and selection free. Past the budget, canvas with an offscreen colour-index buffer for hit-testing. **Measure at M0** — a plate that stutters on hover kills the linkage, which is the whole product.

**Attribution is structural.** CC-BY-SA requires it, so attribution appears on the plate, in the export, and in the repository — not as an easily-removed footer.

**Refuse rather than invent.** A language with no polygon is a point, labelled. No convex hulls, no Voronoi presented as territory. A Voronoi layer may exist later as an explicitly-labelled approximation, off by default.

## 8. Testing

**Referential integrity.** Every polygon resolves to a glottocode present in the languoid table; every languoid's ancestry chain resolves to a root family; no cycles in the tree.

**Coverage report is generated, not asserted by hand.** The pipeline emits polygon-versus-point counts, and that number is what the page displays. It cannot drift from reality.

**Tree queries.** Ancestors, descendants, and subtree selection asserted against fixtures drawn from known family structures — Austronesian's Malayo-Polynesian subgrouping is a good one because it is deep and well documented.

**Licence gate at build time.** Every source declares its licence and version; the build fails on an unresolved one. **A test asserts no Ethnologue-derived field exists in the bundle.**

**Determinism.** Same source versions produce a byte-identical bundle.

**Render budget.** Vertex count and hover latency asserted against the stated budget.

## 9. Design direction

The material world is the **lithographic atlas plate** — flat spot colours, hairline boundaries, letterpress index, aged paper. Authentic, since a language atlas is literally what this is, and flat fills are exactly what family colouring wants.

**Palette.** Plate `#F1ECE0`. Boundary hairline `#2A2620`. Sea `#DDE4E4`, pale enough to recede entirely.

**Family colours are a curated muted set** — ochre, terracotta, sage, slate blue, mauve, olive, dusty rose, teal — assigned stably by family, never generated from a rainbow ramp. Muted is not a stylistic preference here: with this many categories, saturation must be **reserved for the selected family**, so that selecting one thing makes it the only saturated object on the plate. That contrast is the interaction.

**Endangerment is hatching, not hue.** Density increases toward extinction. It composes over family colour instead of competing for the same channel.

**Type.** **EB Garamond** for display and prose — the old-atlas register, and it carries an index page well. **Fira Sans Condensed** for map labels, with italics for hydrographic features per cartographic convention. **IBM Plex Mono** for glottocodes, ISO codes, and counts.

**Structure.** The plate takes the majority of the width; the tree sits as a scrolling column beside it, not beneath, because the linkage only works when both are visible at once. A printed index panel carries the legend, the atlas period, and the coverage figures — an atlas plate always states its sources on the face.

**Motion.** One orchestrated moment: hovering a tree branch, and its territories rising to full saturation while everything else falls back. Selection holds that state. Nothing else animates.

**Copy.** Indonesian first. Family names in their standard scholarly form. The historical caveat is stated on the plate itself, not only in the method page: *"Peta ini menunjukkan sebaran menurut atlas tahun 1980-an, bukan sensus penutur hari ini."*

## 10. Milestones

| | | |
|---|---|---|
| **M0** | Pipeline | Scaffold; fetch, licence gate, Indonesia filter, polygon simplification, coverage report; **render budget measured**. No UI beyond a raw plate. |
| **M1** | The plate | Family colours, points where no polygon, hover and selection, legend, atlas-period label. |
| **M2** | The linkage | Newick tree rendered, bidirectional binding with the map. **Ship publicly here — this is the product.** |
| **M3** | Layers | Endangerment hatching, language panel, sources per entry. |
| **M4** | Guided views | Austronesian–Papuan seam, isolates, most endangered, search. |
| **M5** | Distribution | PNG export with attribution, sharing, coverage and method pages, a11y. |

## 11. Success criteria

- Every polygon resolves to a valid glottocode; every ancestry chain resolves to a root.
- Polygon-versus-point coverage is generated by the pipeline and displayed on the page.
- No Ethnologue-derived field anywhere in the bundle, asserted by test.
- Attribution present on plate, export, and repository.
- Atlas period stated on the plate itself.
- Hover-to-highlight stays within the latency budget on a mid-range laptop.
- Zero network requests after first load.
- Fully offline. JS ≤ 250 KB gzipped, excluding geometry.

## 12. Deployment

`output: 'export'`, `basePath` matching the repository name, `.nojekyll` in the output root. Geometry ships as a separate chunk. Licence gate and coverage generation run in CI and gate the deploy. Fonts self-hosted via `next/font`. Verify under the production `basePath` with `pnpm preview` before pushing.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **Polygon licence unverified.** | Gate at M0. If the GeoJSON cannot be redistributed, the project falls back to a point map — still buildable, less striking, and the fallback must be known before work starts. |
| **Presenting a 1980s atlas as current distribution.** | Period stated on the plate, not the footer. Framed as where languages were described. |
| **Inflating points into territories.** | Points stay points, labelled. No default Voronoi, no convex hulls. |
| **Crisp boundaries overstating sharpness.** | Hairline rendering, stated in copy and method page. Dialect continua acknowledged. |
| **CC-BY-SA share-alike obligations.** | Derived bundle published under the same terms; attribution structural rather than removable. |
| **Ethnologue temptation for speaker counts.** | Banned outright and asserted by test. Ship without counts rather than with borrowed ones. |
| **Family colours indistinguishable at this cardinality.** | Curated muted set, saturation reserved for selection, hatching moved to a separate channel. Check under common colour-vision deficiencies. |
| **Name read as the official Peta Bahasa.** | Different name, no government branding, stated as a personal project. |
