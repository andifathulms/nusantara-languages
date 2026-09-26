/**
 * The front page's tour: families lit one after another on the still of the plate, until the
 * reader takes over. Pure — the stops are read from the model the page already builds, and the
 * lighting is a stylesheet generated here, so the client only has to flip one attribute.
 *
 * Saturation still means selection (invariant 10): one family at a time is lit, in its selected
 * ink, and everything else falls back. The tour performs the plate's one interaction for a reader
 * who has not tried it yet.
 */

import type { FamilyColourToken } from '../colour'
import type { TreeRow } from './build'

export type TourStop = {
  readonly glottocode: string
  readonly name: string
  readonly languageCount: number
  readonly extentKm: number | null
  readonly colour: FamilyColourToken
}

/**
 * The order is an argument. It opens on North Halmahera, where the seam runs, crosses to a Papuan
 * family inside the Austronesian sweep, then the large Papuan families of the east, and only then
 * shows Austronesian — so the first thing lit is never "most of the map".
 */
export const TOUR_FAMILIES = [
  'nort2923', // North Halmahera
  'timo1261', // Timor-Alor-Pantar
  'nucl1709', // Nuclear Trans New Guinea
  'lake1255', // Lakes Plain
  'aust1307', // Austronesian
  'toro1256', // Tor-Orya
] as const

export function tourStops(
  rows: readonly TreeRow[],
  codes: readonly string[] = TOUR_FAMILIES,
): readonly TourStop[] {
  const byCode = new Map(rows.map((row) => [row.glottocode, row]))
  return codes.flatMap((code) => {
    const row = byCode.get(code)
    if (row === undefined || row.depth !== 0) return []
    return [
      {
        glottocode: row.glottocode,
        name: row.name,
        languageCount: row.languageCount,
        extentKm: row.extentKm,
        colour: row.colour,
      },
    ]
  })
}

/**
 * The stylesheet that lights a stop. Scoped to an element carrying `data-lit`; shapes carry
 * `data-family`. An area takes its family's selected ink as fill, a point takes it as its ring.
 */
export function tourStyles(stops: readonly TourStop[], scope: string): string {
  const rules = [
    `${scope} [data-family]{transition:fill 320ms cubic-bezier(.2,0,.2,1),stroke 320ms cubic-bezier(.2,0,.2,1),opacity 320ms cubic-bezier(.2,0,.2,1)}`,
    `${scope}[data-lit] [data-family]{opacity:.38}`,
    ...stops.flatMap((stop) => {
      const lit = `${scope}[data-lit="${stop.glottocode}"] [data-family="${stop.glottocode}"]`
      const ink = `var(--family-${stop.colour}-selected)`
      return [
        `${lit}{opacity:1}`,
        `${scope}[data-lit="${stop.glottocode}"] path[data-family="${stop.glottocode}"]{fill:${ink}}`,
        `${scope}[data-lit="${stop.glottocode}"] circle[data-family="${stop.glottocode}"]{stroke:${ink}}`,
      ]
    }),
    `@media (prefers-reduced-motion:reduce){${scope} [data-family]{transition:none}}`,
  ]
  return rules.join('')
}
