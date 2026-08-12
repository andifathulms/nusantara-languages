/**
 * CSV reading for the build-time pipeline. Pure.
 *
 * CLDF tables are RFC 4180 with quoted fields that contain commas and newlines —
 * Glottolog's `values.csv` holds whole Newick subtrees in a single cell — so a
 * `split(',')` would corrupt the classification silently. This is small enough to own,
 * and the pipeline is the only caller.
 */

export type CsvRow = Readonly<Record<string, string>>

/** Splits one CSV record into fields, honouring quotes and doubled `""` escapes. */
function splitRecord(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const character = line[i] as string
    if (quoted) {
      if (character === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 1
          continue
        }
        quoted = false
        continue
      }
      field += character
      continue
    }
    if (character === '"') {
      quoted = true
      continue
    }
    if (character === ',') {
      fields.push(field)
      field = ''
      continue
    }
    field += character
  }
  fields.push(field)
  return fields
}

/**
 * Splits CSV text into records, keeping newlines that sit inside quoted fields.
 * `\r\n` and `\n` both terminate a record.
 */
export function splitCsvRecords(text: string): string[] {
  const records: string[] = []
  let record = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i] as string
    if (character === '"') {
      quoted = !quoted
      record += character
      continue
    }
    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[i + 1] === '\n') i += 1
      if (record !== '') records.push(record)
      record = ''
      continue
    }
    record += character
  }
  if (record !== '') records.push(record)
  return records
}

/** Parses CSV text into rows keyed by header. A short row's missing fields read as ''. */
export function parseCsv(text: string): CsvRow[] {
  const records = splitCsvRecords(text)
  const header = records[0]
  if (header === undefined) return []
  const columns = splitRecord(header)

  return records.slice(1).map((record) => {
    const fields = splitRecord(record)
    const row: Record<string, string> = {}
    for (const [index, column] of columns.entries()) {
      row[column] = fields[index] ?? ''
    }
    return row
  })
}

/**
 * Streams rows, so a 21 MB values table never has to be held as an array of objects.
 * `visit` may return `false` to stop early.
 */
export function forEachCsvRow(
  text: string,
  visit: (row: CsvRow) => void | false,
): void {
  const records = splitCsvRecords(text)
  const header = records[0]
  if (header === undefined) return
  const columns = splitRecord(header)

  for (const record of records.slice(1)) {
    const fields = splitRecord(record)
    const row: Record<string, string> = {}
    for (const [index, column] of columns.entries()) {
      row[column] = fields[index] ?? ''
    }
    if (visit(row) === false) return
  }
}

/** CLDF semicolon-separated list column, e.g. `Countries`. */
export function csvList(value: string): string[] {
  return value
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
}
