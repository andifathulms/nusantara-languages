import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES, dictionary, format, isLocale, localePath } from '@/lib/i18n'

describe('format', () => {
  it('does not group a year', () => {
    // This shipped as "atlas 1.990–2.020" on the plate: Indonesian groups thousands with a
    // period, and a template cannot know a year from a count.
    expect(
      format(dictionary('id').plate.period, { fromYear: 1990, toYear: 2020 }),
    ).toBe('Sebaran wilayah menurut sumber atlas 1990–2020')
    expect(
      format(dictionary('en').plate.period, { fromYear: 1990, toYear: 2020 }),
    ).toBe('Distribution as described by atlas sources, 1990–2020')
  })

  it('fills several placeholders', () => {
    expect(
      format(dictionary('id').plate.coverage, {
        withPolygon: 421,
        total: 726,
        percent: 58,
      }),
    ).toBe('421 dari 726 bahasa memiliki wilayah (58%); sisanya hanya titik.')
  })

  it('keeps a decimal percentage readable', () => {
    expect(
      format('{percent}%', { percent: 57.9 }),
    ).toBe('57.9%')
  })

  it('leaves an unknown placeholder in place rather than blanking it', () => {
    expect(format('{a} and {b}', { a: 'one' })).toBe('one and {b}')
  })

  it('substitutes a repeated placeholder everywhere', () => {
    expect(format('{n}, {n}, {n}', { n: 3 })).toBe('3, 3, 3')
  })

  it('leaves a template with no placeholders alone', () => {
    expect(format('Peta', { n: 1 })).toBe('Peta')
  })
})

describe('the dictionaries', () => {
  it('cover every locale', () => {
    for (const locale of LOCALES) {
      expect(dictionary(locale).siteTitle.length).toBeGreaterThan(0)
    }
    expect(isLocale(DEFAULT_LOCALE)).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })

  it('carry the same keys in both locales, so nothing is untranslated', () => {
    const keysOf = (value: unknown, prefix = ''): string[] => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix]
      return Object.entries(value).flatMap(([key, child]) =>
        keysOf(child, prefix === '' ? key : `${prefix}.${key}`),
      )
    }
    expect(keysOf(dictionary('en')).sort()).toEqual(keysOf(dictionary('id')).sort())
  })

  it('use the same placeholders in both locales', () => {
    const placeholders = (text: string): string[] =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort()
    const walk = (left: unknown, right: unknown, path = ''): void => {
      if (typeof left === 'string' && typeof right === 'string') {
        expect(placeholders(right), path).toEqual(placeholders(left))
        return
      }
      if (
        left !== null &&
        right !== null &&
        typeof left === 'object' &&
        typeof right === 'object' &&
        !Array.isArray(left)
      ) {
        for (const key of Object.keys(left)) {
          walk(
            (left as Record<string, unknown>)[key],
            (right as Record<string, unknown>)[key],
            path === '' ? key : `${path}.${key}`,
          )
        }
      }
    }
    walk(dictionary('id'), dictionary('en'))
  })

  it('is serialisable, since it crosses into client components', () => {
    for (const locale of LOCALES) {
      const round = JSON.parse(JSON.stringify(dictionary(locale)))
      expect(round).toEqual(dictionary(locale))
    }
  })
})

describe('localePath', () => {
  it('prefixes the locale', () => {
    expect(localePath('id', 'peta')).toBe('/id/peta')
    expect(localePath('en', '/metode')).toBe('/en/metode')
    expect(localePath('id')).toBe('/id')
  })
})
