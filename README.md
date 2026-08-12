# Nusantara Languages

**Live: <https://andifathulms.github.io/nusantara-languages/>**

**Seven hundred and fifty-six languages of Indonesia, coloured by family, with the
genealogical tree beside the map and the two bound together.** Hover a branch and its
territories light up; click a territory and the tree scrolls to it and opens its
ancestry from the root family down.

A personal, open-source, educational project. Static site, no backend, no runtime
network requests.

> **Peta ini bukan sensus penutur hari ini.** Sebaran wilayah mengikuti atlas bahasa
> yang diterbitkan pada 2007 (dan sumber turunannya yang lebih tua); batas antarbahasa
> pada kenyataannya berupa gradien, bukan garis.

---

## What it is

| | |
|---|---|
| Languages (Glottolog v5.3, `Countries` contains `ID`) | 756 |
| With a speaker-area polygon | see `data/bundle/coverage.json` — generated, never hand-written |
| Everything else | drawn as a **point**, marked as a point, never inflated into a territory |

Three things the map does not pretend:

1. **It is not current.** The polygon sources describe where languages were documented,
   not who speaks what today. The period is stated on the plate itself.
2. **Points are midpoints.** Glottolog's coordinate is frequently a midpoint of a
   dispersed or disjoint population. A point stays a point — no convex hulls, no
   default Voronoi.
3. **Boundaries are gradients.** Dialect continua are the norm. Boundaries render as
   hairlines, and the method page says so plainly.

Coverage is published rather than hidden: the pipeline emits the polygon-versus-point
count and the page displays that number.

## Data and licences

Glottolog (CC-BY-4.0) is the spine. Polygons come from CC-BY-4.0 Glottography
datasets. **The Wurm & Hattori Glottography dataset is CC-BY-NC-4.0 and is excluded**
— see [LICENSE-DATA.md](LICENSE-DATA.md) for why, and for the full source table.

**Ethnologue is never used, in any field.** A test asserts the bundle carries no field
traceable to it. Shipping without speaker counts is honest; shipping with borrowed
ones is a licence problem and a factual one.

Code is MIT ([LICENSE](LICENSE)). The derived bundle is CC-BY-SA-4.0
([LICENSE-DATA.md](LICENSE-DATA.md)).

## Measured, not assumed

`pnpm bench:plate` gates the render budget, and these are the numbers it reports for the
bundle that ships:

| | measured | budget |
|---|---|---|
| Polygon vertices | 19,570 | 60,000 |
| Path build (whole plate) | ~10 ms | 400 ms |
| Hover hit-test, p95 | 0.01 ms | 2 ms |

The vertex count is the one that decides the architecture: inside it, the plate is SVG and
the browser hit-tests hover for free. Past it, the plate becomes canvas with an offscreen
colour-index buffer.

Payload, from the export: shared JS 87 KB, the plate page 99 KB first-load JS — inside the
250 KB budget. The plate page's HTML is 1.79 MB raw / 307 KB gzipped, nearly all of it
geometry, which is served as its own page payload rather than a runtime request. The model
carries some redundancy that could be trimmed (ancestry names are repeated per language,
~150 KB raw); it has not been, and the figure above is what ships today.

## Development

```bash
pnpm install
pnpm sources:fetch        # dev/CI only — pulls Glottolog + Glottography releases into data/raw
pnpm sources:build        # filter to Indonesia, simplify, emit data/bundle + coverage.json
pnpm sources:validate     # licence gate, version pinning, referential integrity
pnpm dev
```

```bash
pnpm test:run             # before every commit
pnpm test:integrity       # glottocode resolution, tree acyclicity, ancestry chains
pnpm test:licence         # no Ethnologue-derived fields; manifest completeness
pnpm bench:plate          # vertex count + hover latency against budget
pnpm build && pnpm preview
```

Raw worldwide dumps are never committed — `data/raw/` is ignored. The filtered,
simplified bundle in `data/bundle/` is what ships.

## Reading order

- [PRD.md](PRD.md) — scope, especially §3 (data) and §4 (what the map must not pretend)
- [CLAUDE.md](CLAUDE.md) — how to work in this repo, and the invariants

## Not "Peta Bahasa"

Badan Bahasa publishes an official product under that name. This carries no government
or OIKN branding and makes no claim of affiliation.

## Attribution

Glottolog: Hammarström, Harald & Forkel, Robert & Haspelmath, Martin & Bank, Sebastian.
2026. *Glottolog 5.3*. Leipzig: Max Planck Institute for Evolutionary Anthropology.
Polygons: Glottography, derived from Asher & Moseley 2007 and Schapper 2020 — full
citations in [LICENSE-DATA.md](LICENSE-DATA.md) and in `data/bundle/manifest.json`.
