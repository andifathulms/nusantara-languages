import { describe, expect, it } from 'vitest'
import { MAKER } from '@/components/site/MakerSignature'

/**
 * The maker's mark is the one place in the site that links off-origin on purpose, so the things
 * that can rot quietly are asserted: a typo'd handle, a bare http URL, a missing label.
 */

describe('the maker’s mark', () => {
  it('names the author and points at a portfolio', () => {
    expect(MAKER.name).not.toBe('')
    expect(MAKER.portfolio).toMatch(/^https:\/\//)
  })

  it('leads with the portfolio, then the platforms', () => {
    expect(MAKER.links.map((link) => link.label)).toEqual([
      'Portfolio',
      'GitHub',
      'LinkedIn',
      'Instagram',
    ])
  })

  it('uses https for every link, since the site is served over it', () => {
    for (const link of MAKER.links) {
      expect(link.href, link.label).toMatch(/^https:\/\//)
    }
  })

  it('gives every icon link a label to announce', () => {
    for (const link of MAKER.links) {
      expect(link.label.trim().length, link.href).toBeGreaterThan(0)
    }
  })

  it('has no duplicate destination or label', () => {
    expect(new Set(MAKER.links.map((link) => link.href)).size).toBe(MAKER.links.length)
    expect(new Set(MAKER.links.map((link) => link.label)).size).toBe(MAKER.links.length)
  })

  it('keeps the portfolio link and the name link pointing at the same place', () => {
    const portfolio = MAKER.links.find((link) => link.label === 'Portfolio')
    expect(portfolio?.href).toBe(MAKER.portfolio)
  })

  it('points each platform link at that platform’s own domain', () => {
    const expected: Record<string, string> = {
      GitHub: 'github.com',
      LinkedIn: 'linkedin.com',
      Instagram: 'instagram.com',
    }
    for (const link of MAKER.links) {
      const host = expected[link.label]
      if (host === undefined) continue
      expect(new URL(link.href).hostname.endsWith(host), link.label).toBe(true)
    }
  })
})
