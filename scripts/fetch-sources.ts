/**
 * DEV/CI only. Pulls the pinned source releases into `data/raw/`, which is gitignored —
 * raw worldwide dumps are never committed. The gate runs first: nothing is downloaded
 * until every licence resolves.
 *
 *   pnpm sources:fetch            # skips files already present
 *   pnpm sources:fetch --force    # re-downloads
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { pipeline } from 'node:stream/promises'
import { dirname, join } from 'node:path'
import { MANIFEST, gateSources, refusedSources } from '../lib/sources/manifest'

const RAW_DIR = join(process.cwd(), 'data', 'raw')
const force = process.argv.includes('--force')

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function download(url: string, destination: string): Promise<number> {
  mkdirSync(dirname(destination), { recursive: true })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  if (response.body === null) throw new Error(`empty body for ${url}`)
  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream),
    createWriteStream(destination),
  )
  return statSync(destination).size
}

async function main(): Promise<void> {
  const gate = gateSources(MANIFEST)
  if (gate.type !== 'ok') {
    console.error('licence gate refused the fetch:')
    for (const problem of gate.problems) console.error(`  - ${problem}`)
    process.exit(1)
  }

  for (const refused of refusedSources(MANIFEST)) {
    console.log(`skipped  ${refused.id}@${refused.version} (${refused.licence})`)
    console.log(`         ${refused.reason}`)
  }

  let total = 0
  for (const source of gate.bundled) {
    console.log(`\n${source.id}@${source.version}  ${source.licence}`)
    for (const file of source.files) {
      const destination = join(RAW_DIR, file.path)
      if (!force && existsSync(destination)) {
        const size = statSync(destination).size
        total += size
        console.log(`  have  ${file.path.padEnd(40)} ${humanBytes(size)}`)
        continue
      }
      const size = await download(file.url, destination)
      total += size
      console.log(`  got   ${file.path.padEnd(40)} ${humanBytes(size)}`)
    }
  }

  console.log(`\n${humanBytes(total)} in data/raw — gitignored. Next: pnpm sources:build`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
