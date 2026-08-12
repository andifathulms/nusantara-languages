import { describe, expect, it } from 'vitest'
import { csvList, forEachCsvRow, parseCsv, splitCsvRecords } from '@/lib/sources/csv'

describe('parseCsv', () => {
  it('keys rows by header', () => {
    expect(parseCsv('ID,Name\nbali1278,Balinese\n')).toEqual([
      { ID: 'bali1278', Name: 'Balinese' },
    ])
  })

  it('keeps commas inside quoted fields', () => {
    const rows = parseCsv('ID,Name\nsepa1242,"Sepa, Indonesia"\n')
    expect(rows[0]?.Name).toBe('Sepa, Indonesia')
  })

  it('keeps newlines inside quoted fields', () => {
    // Glottolog puts whole Newick subtrees in one cell; a naive split would corrupt them.
    const rows = parseCsv('ID,Tree\nx,"(a:1,\nb:1)r:1;"\n')
    expect(rows[0]?.Tree).toBe('(a:1,\nb:1)r:1;')
    expect(rows).toHaveLength(1)
  })

  it('unescapes doubled quotes', () => {
    const rows = parseCsv('ID,Name\nx,"Ma""anyan"\n')
    expect(rows[0]?.Name).toBe('Ma"anyan')
  })

  it('handles CRLF line endings', () => {
    expect(parseCsv('ID,Name\r\nx,Y\r\n')).toEqual([{ ID: 'x', Name: 'Y' }])
  })

  it('reads a short row’s missing fields as empty', () => {
    expect(parseCsv('A,B,C\n1,2\n')).toEqual([{ A: '1', B: '2', C: '' }])
  })

  it('returns nothing for empty input', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('ignores a trailing newline', () => {
    expect(parseCsv('A\n1\n\n')).toHaveLength(1)
  })
})

describe('splitCsvRecords', () => {
  it('does not split inside quotes', () => {
    expect(splitCsvRecords('a,"b\nc"\nd,e')).toEqual(['a,"b\nc"', 'd,e'])
  })
})

describe('forEachCsvRow', () => {
  it('visits every row', () => {
    const seen: string[] = []
    forEachCsvRow('ID\na\nb\nc\n', (row) => {
      seen.push(row.ID ?? '')
    })
    expect(seen).toEqual(['a', 'b', 'c'])
  })

  it('stops when the visitor returns false', () => {
    const seen: string[] = []
    forEachCsvRow('ID\na\nb\nc\n', (row) => {
      seen.push(row.ID ?? '')
      return row.ID === 'b' ? false : undefined
    })
    expect(seen).toEqual(['a', 'b'])
  })
})

describe('csvList', () => {
  it('splits a CLDF list column', () => {
    expect(csvList('ID;MY;TL')).toEqual(['ID', 'MY', 'TL'])
  })

  it('is empty for an empty cell', () => {
    expect(csvList('')).toEqual([])
  })
})
