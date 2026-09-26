import { describe, expect, it } from 'vitest'
import {
  exportFileName,
  mergeGround,
  paletteStyleBlock,
  toStandaloneSvg,
  withCaption,
} from '@/lib/plate/export'
import { ALL_FAMILY_COLOURS, PLATE_COLOURS } from '@/lib/colour'

const options = { width: 1600, height: 620, title: 'Peta rumpun bahasa' }

describe('the PNG export document', () => {
  it('inlines the palette, since var() means nothing outside the page', () => {
    const style = paletteStyleBlock()
    for (const colour of ALL_FAMILY_COLOURS) {
      expect(style, colour.token).toContain(colour.base)
      expect(style, colour.token).toContain(colour.selected)
    }
    expect(style).toContain(PLATE_COLOURS.plate)
  })

  it('pins a generic font stack, because the rasteriser has no self-hosted faces', () => {
    expect(paletteStyleBlock()).toContain('sans-serif')
  })

  it('adds the SVG namespace so the document stands alone', () => {
    const document = toStandaloneSvg('<svg viewBox="0 0 10 10"></svg>', options)
    expect(document).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('does not add a second namespace when one is there', () => {
    const document = toStandaloneSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>',
      options,
    )
    expect(document?.match(/xmlns=/g)).toHaveLength(1)
  })

  it('states an explicit pixel size rather than leaving it to be guessed', () => {
    const document = toStandaloneSvg('<svg width="100%" viewBox="0 0 10 10"></svg>', options)
    expect(document).toContain('width="1600"')
    expect(document).toContain('height="620"')
    expect(document).not.toContain('width="100%"')
  })

  it('paints the sea, because a PNG has no page behind it', () => {
    // The plate's ground is the sea, which the plate itself only paints inside its viewBox.
    expect(toStandaloneSvg('<svg viewBox="0 0 10 10"></svg>', options)).toContain(
      `fill="${PLATE_COLOURS.sea}"`,
    )
  })

  it('keeps the plate’s own attribution, which is why it lives in the geometry', () => {
    const plate = '<svg viewBox="0 0 10 10"><text>Glottolog 5.3 (CC-BY-4.0)</text></svg>'
    expect(toStandaloneSvg(plate, options)).toContain('Glottolog 5.3 (CC-BY-4.0)')
  })

  it('titles the document, escaping the title', () => {
    const document = toStandaloneSvg('<svg viewBox="0 0 1 1"></svg>', {
      ...options,
      title: 'Peta & "rumpun"',
    })
    expect(document).toContain('<title>Peta &amp; &quot;rumpun&quot;</title>')
  })

  it('refuses anything that is not an svg, rather than exporting a blank', () => {
    expect(toStandaloneSvg('<div>not a plate</div>', options)).toBeNull()
    expect(toStandaloneSvg('', options)).toBeNull()
  })
})

describe('the export file name', () => {
  it('carries the view and the date it was taken', () => {
    expect(exportFileName('peta', '2026-08-12')).toBe('nusantara-peta-2026-08-12.png')
  })

  it('is safe for a file system', () => {
    expect(exportFileName('Jahitan Austronesia/Papua', '2026-08-12')).toBe(
      'nusantara-jahitan-austronesia-papua-2026-08-12.png',
    )
  })
})

describe('putting the ground back under the plate', () => {
  const ground = '<svg viewBox="0 0 10 10" aria-hidden="true"><rect id="sea"/><g id="land"/></svg>'
  const plate = '<svg id="plate" viewBox="0 0 10 10"><g id="shapes"/><text>Glottolog</text></svg>'

  it('draws the ground first, inside the plate, so the shapes sit on it', () => {
    const merged = mergeGround(plate, ground)
    expect(merged).toBe(
      '<svg id="plate" viewBox="0 0 10 10"><rect id="sea"/><g id="land"/><g id="shapes"/><text>Glottolog</text></svg>',
    )
  })

  it('keeps one svg element, so the export is still one document', () => {
    expect(mergeGround(plate, ground)?.match(/<svg/g)).toHaveLength(1)
  })

  it('refuses markup that is not an svg rather than producing an empty export', () => {
    expect(mergeGround('<div></div>', ground)).toBeNull()
    expect(mergeGround(plate, '<div></div>')).toBeNull()
  })
})

describe('the export card', () => {
  const plate = toStandaloneSvg(
    '<svg viewBox="0 0 10 10"><text>Glottolog 5.3 (CC-BY-4.0)</text></svg>',
    options,
  ) as string
  const caption = {
    title: 'Peta rumpun bahasa',
    selection: 'North Halmahera · 15 bahasa',
    period: 'Sumber atlas 1990–2020, bukan sensus penutur hari ini.',
    site: 'andifathulms.github.io/nusantara-languages',
  }

  it('carries the plate unchanged, attribution included', () => {
    expect(withCaption(plate, options, caption)).toContain('Glottolog 5.3 (CC-BY-4.0)')
  })

  it('adds a caption band below, stating the selection and the period', () => {
    const card = withCaption(plate, options, caption) ?? ''
    expect(card).toContain('North Halmahera')
    expect(card).toContain('bukan sensus penutur hari ini')
    const height = Number(card.match(/^<svg[^>]*height="(\d+)"/)?.[1])
    expect(height).toBeGreaterThan(options.height)
  })

  it('escapes what it writes, so a name cannot break the document', () => {
    expect(withCaption(plate, options, { ...caption, selection: 'A & <B>' })).toContain('A &amp; &lt;B&gt;')
  })

  it('refuses anything that is not an svg', () => {
    expect(withCaption('<div/>', options, caption)).toBeNull()
  })
})
