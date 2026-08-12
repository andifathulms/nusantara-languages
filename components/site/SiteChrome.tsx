import Link from 'next/link'
import { dictionary, localePath, type Locale, LOCALES } from '@/lib/i18n'

/**
 * Masthead and footer. Attribution in the footer is a courtesy, not the licence
 * obligation — that one is discharged on the plate itself and inside the exported PNG,
 * where a layout change cannot remove it.
 */
export function SiteHeader({ locale, current }: { locale: Locale; current?: string }) {
  const strings = dictionary(locale)
  const items = [
    { href: '', label: strings.nav.home, key: 'home' },
    { href: 'peta', label: strings.nav.plate, key: 'peta' },
    { href: 'pandu', label: strings.nav.guided, key: 'pandu' },
    { href: 'metode', label: strings.nav.method, key: 'metode' },
  ]

  return (
    <header className="border-b border-boundary/25">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-3">
        <Link
          href={localePath(locale, 'peta')}
          className="font-display text-lg tracking-tight hover:underline"
        >
          {strings.siteTitle}
        </Link>

        <nav aria-label={strings.nav.home} className="flex items-baseline gap-4">
          {items.map((item) => (
            <Link
              key={item.key}
              href={localePath(locale, item.href)}
              aria-current={current === item.key ? 'page' : undefined}
              className={`index-label hover:text-boundary ${
                current === item.key ? 'text-boundary underline' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-baseline gap-2">
          {LOCALES.map((candidate) => (
            <Link
              key={candidate}
              href={localePath(candidate, current === 'home' ? '' : (current ?? ''))}
              hrefLang={candidate}
              aria-current={candidate === locale ? 'true' : undefined}
              className={`index-label ${candidate === locale ? 'text-boundary underline' : ''}`}
            >
              {candidate.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const strings = dictionary(locale)
  return (
    <footer className="mt-10 border-t border-boundary/25">
      <div className="mx-auto max-w-[1600px] space-y-1 px-5 py-5 text-sm text-boundary/75">
        <p>{strings.plate.attribution}</p>
        <p>{strings.home.personalProject}</p>
      </div>
    </footer>
  )
}
