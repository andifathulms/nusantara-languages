/**
 * Turns the plate that is on screen into a standalone SVG document, for the PNG export.
 * Pure: it takes the plate's markup as a string and returns a document string, so the
 * substitution is testable in Node and the component only has to hand over `outerHTML`.
 *
 * Two things have to be resolved for the plate to survive being detached from the page:
 *
 *   1. `var(--family-teal)` means nothing outside the document, so the palette is inlined as
 *      a `:root` block inside the SVG itself.
 *   2. The label fonts are self-hosted and will not be available to a canvas rasterising a
 *      data URL, so families are pinned to generic stacks instead of shipping a font.
 *
 * The attribution line is already drawn inside the plate, so the export carries it by
 * construction rather than by remembering to add it — which is the point of putting it there.
 */

import { ALL_FAMILY_COLOURS, PLATE_COLOURS, cssVariable } from '../colour'

export type ExportOptions = {
  readonly width: number
  readonly height: number
  /** Appears as the document title, for a screen reader and for the file itself. */
  readonly title: string
}

export function paletteStyleBlock(): string {
  const declarations = [
    ...ALL_FAMILY_COLOURS.flatMap((colour) => [
      `${cssVariable(colour, 'base')}: ${colour.base};`,
      `${cssVariable(colour, 'selected')}: ${colour.selected};`,
    ]),
    ...Object.entries(PLATE_COLOURS).map(([token, value]) => `--plate-${token}: ${value};`),
  ].join('')

  return (
    `:root{${declarations}}` +
    // Generic stacks: the rasteriser has no access to the self-hosted faces.
    `text{font-family:'IBM Plex Sans Condensed','Arial Narrow',Helvetica,Arial,sans-serif}` +
    `.font-label{font-family:'IBM Plex Sans Condensed','Arial Narrow',Helvetica,Arial,sans-serif}`
  )
}

/**
 * Builds the standalone document. `markup` is the plate's `outerHTML`; anything that is not an
 * `<svg>` element is refused rather than wrapped, because a silently empty export is worse
 * than a failed one.
 */
export function toStandaloneSvg(markup: string, options: ExportOptions): string | null {
  if (!markup.trimStart().startsWith('<svg')) return null

  const withNamespace = markup.includes('xmlns=')
    ? markup
    : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

  // An explicit pixel size, so the rasteriser does not have to guess from the viewBox.
  const sized = withNamespace
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace('<svg', `<svg width="${options.width}" height="${options.height}"`)

  const head =
    `<title>${escapeXml(options.title)}</title>` +
    `<style>${paletteStyleBlock()}</style>` +
    // The sea is painted explicitly: a PNG has no page behind it to inherit.
    `<rect x="0" y="0" width="${options.width}" height="${options.height}" fill="${PLATE_COLOURS.sea}"/>`

  return sized.replace(/>/, `>${head}`)
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Puts the ground back under the plate. On screen the sea, coastline and graticule are a separate
 * SVG stacked beneath the interactive one, so a hover never repaints them; an exported PNG has to
 * be one document, so the ground's contents go in first, right after the plate's opening tag.
 *
 * Both SVGs share one viewBox and one transform, so nothing needs re-projecting. Anything that is
 * not an `<svg>` is refused, as in `toStandaloneSvg`.
 */
export function mergeGround(plateMarkup: string, groundMarkup: string): string | null {
  if (!plateMarkup.trimStart().startsWith('<svg')) return null
  if (!groundMarkup.trimStart().startsWith('<svg')) return null
  const groundOpen = groundMarkup.indexOf('>')
  const groundClose = groundMarkup.lastIndexOf('</svg>')
  if (groundOpen === -1 || groundClose === -1 || groundClose < groundOpen) return null
  const inner = groundMarkup.slice(groundOpen + 1, groundClose)
  const plateOpen = plateMarkup.indexOf('>')
  return `${plateMarkup.slice(0, plateOpen + 1)}${inner}${plateMarkup.slice(plateOpen + 1)}`
}

/** `nusantara-bahasa-2026-08-12.png`-shaped, with the date passed in rather than read. */
export function exportFileName(slug: string, isoDate: string): string {
  const safe = slug.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
  return `nusantara-${safe}-${isoDate}.png`
}
