import { describe, expect, it } from 'vitest'
import { exportFileName, paletteStyleBlock, toStandaloneSvg } from '@/lib/plate/export'
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

  it('paints the paper, because a PNG has no page behind it', () => {
    expect(toStandaloneSvg('<svg viewBox="0 0 10 10"></svg>', options)).toContain(
      `fill="${PLATE_COLOURS.plate}"`,
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
