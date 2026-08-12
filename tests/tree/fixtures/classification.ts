/**
 * Fixtures taken verbatim from Glottolog 5.3 `cldf/classification.nex`, so the tree
 * queries are asserted against a real, deep, well-documented subgrouping rather than a
 * toy shape. Both sit inside Austronesian (aust1307).
 *
 *   piru1243  Piru Bay, Central Maluku — 8 levels deep, 19 languages
 *   sumb1242  Sumba-Hawu, Lesser Sunda — 4 levels deep, 11 languages
 *
 * Names and levels are Glottolog's own, from `cldf/languages.csv` at the same release.
 */

import type { LanguoidLevel } from '@/lib/tree'

export const PIRU_BAY_NEWICK =
  '(((sepa1242:1,telu1263:1)east2757:1,(paul1238:1,(((laha1251:1,seit1239:1)cent2289:1,' +
  '(hitu1239:1,tule1244:1)nort3236:1)ambo1254:1,kaib1244:1,((haru1244:1,((amah1245:1,' +
  'nusa1245:1)elpa1239:1,(latu1237:1,sapa1251:1)sapa1250:1)hatu1244:1)hatu1247:1,' +
  'kama1362:1)ulia1238:1)sera1270:1)sole1243:1)east2752:1,(asil1242:1,((boan1242:1,' +
  'lari1255:1)east2468:1,(luhu1243:1,mani1297:1)west2853:1)hoam1238:1)west2843:1)piru1243;'

export const SUMBA_HAWU_NEWICK =
  '((dhao1237:1,sabu1255:1)hawu1234:1,(((anak1240:1,bali1287:1,wanu1241:1)cent2307:1,' +
  'kamb1299:1,mamb1305:1)kamb1320:1,(ngga1239:1,kodi1247:1)kodi1251:1,(lamb1273:1,' +
  'weje1237:1)wewe1239:1)sumb1243:1)sumb1242;'

export const GLOTTOLOG_FIXTURE: Readonly<
  Record<string, { readonly name: string; readonly level: LanguoidLevel }>
> = {
  // Piru Bay
  piru1243: { name: 'Piru Bay', level: 'family' },
  east2752: { name: 'East Piru Bay', level: 'family' },
  west2843: { name: 'West Piru Bay', level: 'family' },
  east2757: { name: 'Eastern Littoral Piru Bay', level: 'family' },
  sole1243: { name: 'Solehua', level: 'family' },
  sera1270: { name: 'Seram Straits', level: 'family' },
  ambo1254: { name: 'Ambonic', level: 'family' },
  cent2289: { name: 'Central Ambon', level: 'family' },
  nort3236: { name: 'Northeast Ambon', level: 'family' },
  ulia1238: { name: 'Uliase', level: 'family' },
  hatu1247: { name: 'Hatuhaha', level: 'family' },
  hatu1244: { name: 'Saparuan', level: 'family' },
  elpa1239: { name: 'Elpaputi', level: 'family' },
  sapa1250: { name: 'Saparua-Latu', level: 'family' },
  hoam1238: { name: 'Hoamoal', level: 'family' },
  east2468: { name: 'East Hoamoal', level: 'family' },
  west2853: { name: 'West Hoamoal', level: 'family' },
  sepa1242: { name: 'Sepa (Indonesia)', level: 'language' },
  telu1263: { name: 'Teluti', level: 'language' },
  paul1238: { name: 'Paulohi', level: 'language' },
  laha1251: { name: 'Laha (Indonesia)', level: 'language' },
  seit1239: { name: 'Seit-Kaitetu', level: 'language' },
  hitu1239: { name: 'Hitu', level: 'language' },
  tule1244: { name: 'Tulehu', level: 'language' },
  kaib1244: { name: 'Kaibobo', level: 'language' },
  haru1244: { name: 'Haruku', level: 'language' },
  amah1245: { name: 'Amahai', level: 'language' },
  nusa1245: { name: 'Nusa Laut', level: 'language' },
  latu1237: { name: 'Latu', level: 'language' },
  sapa1251: { name: 'Saparua', level: 'language' },
  kama1362: { name: 'Kamarian', level: 'language' },
  asil1242: { name: 'Asilulu', level: 'language' },
  boan1242: { name: 'Boano (Maluku)', level: 'language' },
  lari1255: { name: 'Larike-Wakasihu', level: 'language' },
  luhu1243: { name: 'Luhu-Piru', level: 'language' },
  mani1297: { name: 'Manipa', level: 'language' },

  // Sumba-Hawu
  sumb1242: { name: 'Sumba-Hawu', level: 'family' },
  hawu1234: { name: 'Hawu-Dhao', level: 'family' },
  sumb1243: { name: 'Sumba', level: 'family' },
  kamb1320: { name: 'Central-East Sumbanese', level: 'family' },
  cent2307: { name: 'Central Sumbanese', level: 'family' },
  kodi1251: { name: 'Kodi-Gaura', level: 'family' },
  wewe1239: { name: 'Wewewa-Laboya', level: 'family' },
  dhao1237: { name: 'Dhao', level: 'language' },
  sabu1255: { name: 'Hawu', level: 'language' },
  anak1240: { name: 'Anakalang', level: 'language' },
  bali1287: { name: 'Baliledu-Buawa', level: 'language' },
  wanu1241: { name: 'Wanukaka', level: 'language' },
  kamb1299: { name: 'Kambera', level: 'language' },
  mamb1305: { name: 'Mamboru', level: 'language' },
  ngga1239: { name: 'Garo (Sumba)', level: 'language' },
  kodi1247: { name: 'Kodi', level: 'language' },
  lamb1273: { name: 'Lamboya', level: 'language' },
  weje1237: { name: 'Wewewa', level: 'language' },
}

export const FIXTURE_TREES = [
  { name: 'piru1243', newick: PIRU_BAY_NEWICK },
  { name: 'sumb1242', newick: SUMBA_HAWU_NEWICK },
] as const

export const FIXTURE_LANGUAGES: readonly string[] = Object.entries(GLOTTOLOG_FIXTURE)
  .filter(([, entry]) => entry.level === 'language')
  .map(([glottocode]) => glottocode)

export const levelOf = (glottocode: string): LanguoidLevel | null =>
  GLOTTOLOG_FIXTURE[glottocode]?.level ?? null

export const nameOf = (glottocode: string): string =>
  GLOTTOLOG_FIXTURE[glottocode]?.name ?? glottocode
