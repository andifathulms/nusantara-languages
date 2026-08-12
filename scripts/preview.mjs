/**
 * Serves ./out under the production basePath, so the exported site is verified the
 * way GitHub Pages will serve it. No dependencies — a static file server is not a
 * reason to add one.
 */
import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'

const BASE_PATH = '/nusantara-languages'
const ROOT = new URL('../out/', import.meta.url).pathname
const PORT = Number(process.env.PORT ?? 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

function resolve(pathname) {
  if (!pathname.startsWith(BASE_PATH)) return null
  const rest = normalize(decodeURIComponent(pathname.slice(BASE_PATH.length)) || '/')
  if (rest.includes('..')) return null
  const candidates = rest.endsWith('/')
    ? [join(ROOT, rest, 'index.html')]
    : [join(ROOT, rest), join(ROOT, `${rest}.html`), join(ROOT, rest, 'index.html')]
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      // next candidate
    }
  }
  return null
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  if (pathname === '/' || pathname === '') {
    response.writeHead(302, { location: `${BASE_PATH}/` })
    response.end()
    return
  }
  const file = resolve(pathname)
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(`404 — nothing at ${pathname}. The site is served under ${BASE_PATH}/.\n`)
    return
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
  })
  createReadStream(file).pipe(response)
}).listen(PORT, () => {
  console.log(`out/ served at http://localhost:${PORT}${BASE_PATH}/`)
})
