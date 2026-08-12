# Licence — the derived data bundle

Everything under `data/bundle/` is a derived dataset, published under
**Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA-4.0)**.

<https://creativecommons.org/licenses/by-sa/4.0/>

## Sources it derives from

| Source | Version | Licence | Used for |
|---|---|---|---|
| [Glottolog](https://glottolog.org) (`glottolog/glottolog-cldf`) | v5.3 | CC-BY-4.0 | Languoid catalogue, names, ISO codes, classification, point coordinates, genealogical trees, endangerment status (AES) |
| [Glottography — Asher & Moseley 2007, *Atlas of the World's Languages*](https://github.com/Glottography/asher2007world) | v2.0 | CC-BY-4.0 | Language-level speaker-area polygons |
| [Glottography — Schapper 2020, *Papuan languages of Timor, Alor and Pantar*](https://github.com/Glottography/schapper2020papuan) | v2.0 | CC-BY-4.0 | Language-level speaker-area polygons, Alor–Pantar |

Attribution for these appears on the plate itself, in every PNG export, and in
`data/bundle/manifest.json` — not only here.

## Sources deliberately excluded

**Glottography — Wurm & Hattori 1981/83, *Language Atlas of the Pacific Area*
(`Glottography/wurm1981pacific`) is licensed CC-BY-NC-4.0** and is therefore
**not** bundled. The non-commercial restriction cannot be carried into a
CC-BY-SA-4.0 derived dataset, and the project will not redistribute data it is
not licensed to redistribute. This was the atlas the project originally planned
to build on; the licence gate in `lib/sources/manifest.ts` refuses it by
identifier, and `pnpm sources:validate` fails if it is ever reintroduced.

**Ethnologue is not used, in any field, for any purpose.** No speaker counts,
no EGIDS status, no alternate names. The bundle carries no field traceable to
it, and `pnpm test:licence` asserts this. Where a figure is only available from
Ethnologue, the field is absent and the absence is stated on the page.

## Citation

Please cite the original sources, listed above with their versions, alongside
this project.
