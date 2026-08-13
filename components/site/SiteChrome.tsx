import Link from 'next/link'
import { BrandMark } from './BrandMark'
import { MakerSignature } from './MakerSignature'
import { dictionary, localePath, type Locale, LOCALES } from '@/lib/i18n'

/**
 * Masthead and footer.
 *
 * The masthead states the project's name in type, the way an atlas states its title, with the
 * mark set small beside it rather than above it — the wordmark still leads. The current page is
 * marked with the annotation red, the one place in the chrome that uses it. The licence
 * attribution in the footer is a courtesy; the obligation is
 * discharged on the plate itself and inside the exported PNG, where a layout change cannot
 * remove it.
 */

const NAV = [
  { href: 'peta', key: 'peta' },
  { href: 'pandu', key: 'pandu' },
  { href: 'metode', key: 'metode' },
] as const

export function SiteHeader({ locale, current }: { locale: Locale; current?: string }) {
  const strings = dictionary(locale)
  const label = (key: string): string =>
    key === 'peta'
      ? strings.nav.plate
      : key === 'pandu'
        ? strings.nav.guided
        : strings.nav.method

  return (
    <header className="border-b border-boundary/20 bg-plate/80 backdrop-blur-sm">
      <a
        href="#plate"
        className="sr-only focus:not-sr-only focus:absolute focus:z-30 focus:m-2 focus:bg-plate focus:px-3 focus:py-2 focus:underline"
      >
        {strings.a11y.skipToPlate}
      </a>

      <div className="mx-auto flex max-w-plate flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
        <Link href={localePath(locale, '')} className="group flex items-center gap-3 leading-none">
          <BrandMark className="h-8 w-8 shrink-0" />
          <span className="block">
            <span className="block font-display text-title-s leading-none tracking-tight">
              {strings.siteTitle}
            </span>
            <span className="index-label mt-1 block group-hover:text-accent">
              {strings.siteTagline}
            </span>
          </span>
        </Link>

        <nav aria-label={strings.nav.home} className="flex items-baseline gap-5">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={localePath(locale, item.href)}
              aria-current={current === item.key ? 'page' : undefined}
              className={`font-label text-label uppercase transition-colors hover:text-accent ${
                current === item.key
                  ? 'text-accent underline decoration-accent decoration-2 underline-offset-[6px]'
                  : 'text-ink-soft'
              }`}
            >
              {label(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-baseline gap-1">
          {LOCALES.map((candidate, index) => (
            <span key={candidate} className="flex items-baseline gap-1">
              {index > 0 ? <span className="text-ink-soft/50">·</span> : null}
              <Link
                href={localePath(candidate, current === 'home' ? '' : (current ?? ''))}
                hrefLang={candidate}
                aria-current={candidate === locale ? 'true' : undefined}
                className={`font-label text-label uppercase transition-colors hover:text-accent ${
                  candidate === locale ? 'text-boundary' : 'text-ink-soft'
                }`}
              >
                {candidate}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const strings = dictionary(locale)
  return (
    <footer className="mt-16 border-t border-boundary/20">
      {/* One seam, two kinds of statement. Left: the licence attribution and the affiliation
          disclaimer — obligations. Right: the maker's mark — personal credit. Kept apart by
          position rather than by a second rule, so the footer stays a single bottom bar. */}
      <div className="mx-auto flex max-w-plate flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10 sm:px-6">
        <div className="max-w-prose space-y-1 text-body-s text-ink-soft">
          <p>{strings.plate.attribution}</p>
          <p>{strings.home.personalProject}</p>
        </div>
        <MakerSignature className="shrink-0" />
      </div>
    </footer>
  )
}
