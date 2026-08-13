/**
 * After the export: write `.nojekyll` so GitHub Pages serves Next's `_next/` directory, and
 * assert the zero-runtime-request claim rather than trusting it.
 *
 * The check is positive, not a blocklist: every resource the exported HTML and CSS *loads* —
 * stylesheets, scripts, images, fonts, preloads — must be same-origin. A blocklist of font
 * CDN hostnames was the first attempt and it flagged Next's own framework code, which
 * mentions those hosts precisely in order to strip links to them. Anchors are left alone:
 * a link the reader can follow is not a request the page makes.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = new URL('../out/', import.meta.url).pathname

writeFileSync(join(OUT, '.nojekyll'), '')

/**
 * `<link>` rels that name a document rather than fetch a resource.
 *
 * `rel="canonical"` and the hreflang alternates state where a page lives and which pages are
 * its translations. Nothing fetches them — they are metadata read by crawlers, exactly like the
 * absolute og:url this check has always ignored. They have to be absolute to do their job, so
 * without this the site cannot declare its own canonical URL without failing its own gate.
 *
 * Narrow on purpose: `rel="alternate"` also covers feeds, which a reader's client does fetch,
 * so only alternates carrying an hreflang are exempt.
 */
const DOCUMENT_LINK = /\brel=["']canonical["']|\bhreflang=/i

/** Loading attributes, by element. `<a href>` is deliberately absent. */
const LOADERS = [
  /<link\b[^>]*?\bhref=["']([^"']+)["']/gi,
  /<script\b[^>]*?\bsrc=["']([^"']+)["']/gi,
  /<(?:img|image|source|iframe|video|audio|embed)\b[^>]*?\bsrc=["']([^"']+)["']/gi,
  /<[^>]*?\bsrcset=["']([^"']+)["']/gi,
]

const CSS_URL = /url\(\s*["']?([^"')]+)["']?\s*\)/gi

/** Hints that only make sense when a third party is involved. */
const CONNECTION_HINTS = /rel=["'](?:preconnect|dns-prefetch)["']/gi

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else files.push(path)
  }
  return files
}

function isExternal(reference) {
  return /^(?:https?:)?\/\//i.test(reference.trim())
}

const problems = []
let checkedHtml = 0
let checkedCss = 0

for (const file of walk(OUT)) {
  const relative = file.slice(OUT.length)

  if (file.endsWith('.html')) {
    checkedHtml += 1
    const text = readFileSync(file, 'utf8')
    for (const pattern of LOADERS) {
      for (const match of text.matchAll(pattern)) {
        const reference = match[1] ?? ''
        if (DOCUMENT_LINK.test(match[0])) continue
        if (isExternal(reference)) problems.push(`${relative} loads ${reference}`)
      }
    }
    for (const match of text.matchAll(CONNECTION_HINTS)) {
      problems.push(`${relative} declares a connection hint: ${match[0]}`)
    }
    continue
  }

  if (file.endsWith('.css')) {
    checkedCss += 1
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(CSS_URL)) {
      const reference = match[1] ?? ''
      if (isExternal(reference)) problems.push(`${relative} loads ${reference}`)
    }
  }
}

if (problems.length > 0) {
  console.error('postbuild refused: the export loads something off-origin')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const fonts = walk(join(OUT, '_next', 'static', 'media')).filter((file) =>
  file.endsWith('.woff2'),
).length

console.log(
  `out/.nojekyll written. ${checkedHtml} HTML and ${checkedCss} CSS files load nothing ` +
    `off-origin; ${fonts} self-hosted font files.`,
)
