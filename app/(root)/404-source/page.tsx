import Link from 'next/link'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { DEFAULT_LOCALE, dictionary, localePath } from '@/lib/i18n'

/**
 * Source for the export's one global 404 (`out/404.html`) — GitHub Pages serves that file for
 * any unmatched path, so this has to be a real static file the host can find by name, not a
 * Next `not-found.tsx` special file.
 *
 * `not-found.tsx` was tried first and doesn't work here: for `output: 'export'`, Next only ever
 * uses the *true root* `app/not-found.tsx` to produce `out/404.html`, and that file requires an
 * equally true root `app/layout.tsx`. This project deliberately has none — `(root)/layout.tsx`
 * and `(site)/[locale]/layout.tsx` each declare their own `<html>` independently, because only
 * the layout inside `[locale]` can know which language to put on it (see that file's own
 * comment; getting this wrong once already shipped 733 English pages declaring `lang="id"`).
 * Unifying under one top-level layout to satisfy `not-found.tsx` would undo that fix.
 *
 * So this is an ordinary page instead, built with the same chrome, and `scripts/postbuild.mjs`
 * copies its output to `out/404.html` after the export — the same "after the export" role
 * postbuild already plays for `.nojekyll`. The route is deliberately not named `404`: a literal
 * `/404` output path hits a different, special-cased render inside Next's static exporter (the
 * same generic, metadata-less shell as the framework's own built-in not-found page) instead of
 * this page's normal RSC output, which silently dropped the `<title>` tag when tried.
 *
 * Locale-unaware like the bare-origin redirect page: a static host's 404 fallback carries no
 * `params.locale` to read.
 */
const strings = dictionary(DEFAULT_LOCALE)

export const metadata = {
  title: strings.notFound.title,
  robots: { index: false, follow: false },
}

export default function NotFoundSource() {
  return (
    <>
      <SiteHeader locale={DEFAULT_LOCALE} />

      <main id="content" className="mx-auto max-w-prose px-4 py-section-lg sm:px-6">
        <p className="index-label">404</p>
        <h1 className="mt-1 font-display text-title-l">{strings.notFound.title}</h1>
        <p className="mt-4 text-body text-ink-soft">{strings.notFound.body}</p>

        <p className="mt-block-lg flex flex-wrap gap-x-6 gap-y-2">
          <Link href={localePath(DEFAULT_LOCALE, 'peta')} className="link">
            {strings.notFound.backToPlate}
          </Link>
          <Link href={localePath(DEFAULT_LOCALE)} className="link">
            {strings.notFound.backToHome}
          </Link>
        </p>
      </main>

      <SiteFooter locale={DEFAULT_LOCALE} />
    </>
  )
}
