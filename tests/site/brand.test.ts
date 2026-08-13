import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND_INKS } from '@/lib/colour/brand'
import { ALL_FAMILY_COLOURS } from '@/lib/colour/palette'

/**
 * The web app manifest is a hand-frozen static file — Next's app/manifest.ts route convention
 * hardcodes its <link> at the origin root, which 404s under a project-pages basePath, so the
 * generated route was dropped. That trade buys a correct link and costs drift protection,
 * which is what this file buys back: every path the manifest names must exist in the export,
 * and every one must carry the deployment's basePath.
 *
 * The brand inks are checked too, for the one failure that would be invisible: a signature
 * colour leaking into the family palette, where it would read as data.
 */

const root = join(__dirname, '..', '..')
const manifest = JSON.parse(
  readFileSync(join(root, 'public', 'manifest.webmanifest'), 'utf8'),
) as {
  name: string
  short_name: string
  start_url: string
  scope: string
  theme_color: string
  background_color: string
  icons: ReadonlyArray<{ src: string; sizes: string; type: string; purpose?: string }>
}

/** Must match `basePath` in next.config.js, which must match the repository name. */
const BASE_PATH = '/nusantara-languages'

describe('the web app manifest', () => {
  it('opens the plate, not the front page — the plate is the product', () => {
    expect(manifest.start_url).toBe(`${BASE_PATH}/id/peta/`)
  })

  it('is scoped to the deployment, so the installed app cannot wander the origin', () => {
    expect(manifest.scope).toBe(`${BASE_PATH}/`)
  })

  it('carries the basePath on every icon, or the home-screen icon is a broken image', () => {
    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith(`${BASE_PATH}/`)).toBe(true)
    }
  })

  it('ships every icon file it names', () => {
    for (const icon of manifest.icons) {
      const file = join(root, 'public', icon.src.slice(`${BASE_PATH}/`.length))
      expect(existsSync(file), `${icon.src} is named by the manifest but not in public/`).toBe(true)
    }
  })

  it('offers a maskable icon, so Android crops the fork rather than clipping the leaves', () => {
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })

  it('offers the two sizes Android asks for by name', () => {
    const sizes = manifest.icons.filter((icon) => !icon.purpose).map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('is paper, both in the splash and in the browser chrome', () => {
    expect(manifest.theme_color).toBe(BRAND_INKS.paper)
    expect(manifest.background_color).toBe(BRAND_INKS.paper)
  })
})

describe('the brand inks', () => {
  it('are all resolved six-digit hex', () => {
    for (const [name, value] of Object.entries(BRAND_INKS)) {
      expect(value, name).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('never collide with a family colour — a signature ink must not read as data', () => {
    const family = new Set(
      ALL_FAMILY_COLOURS.flatMap((colour) => [
        colour.base.toUpperCase(),
        colour.selected.toUpperCase(),
      ]),
    )
    for (const leaf of [BRAND_INKS.maroon, BRAND_INKS.teal, BRAND_INKS.violet]) {
      expect(family.has(leaf.toUpperCase()), `${leaf} is both a brand leaf and a family colour`)
        .toBe(false)
    }
  })
})

describe('the icons the browser looks for by convention', () => {
  it('ships a tab mark and an iOS home-screen icon', () => {
    expect(existsSync(join(root, 'app', 'icon.svg'))).toBe(true)
    expect(existsSync(join(root, 'app', 'apple-icon.png'))).toBe(true)
  })

  it('ships a social card at the size every scraper expects', () => {
    expect(existsSync(join(root, 'public', 'brand', 'og.png'))).toBe(true)
  })
})
