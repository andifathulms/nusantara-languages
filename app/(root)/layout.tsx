import { PaletteVars } from '@/components/plate/PaletteVars'
import { DEFAULT_LOCALE } from '@/lib/i18n'
import { fontVariables } from '../fonts'
import '../globals.css'

/**
 * The second root layout, for the bare origin only.
 *
 * There are two because a root layout owns `<html>` and therefore owns `lang`, and the locale
 * tree needs that attribute to follow the locale. This one serves a single page — the redirect
 * at `/` — which belongs to no locale, so it declares the default one and nothing else.
 *
 * Deliberately thin: no metadata beyond what that page sets for itself, because nothing here is
 * meant to be indexed or shared. It exists so a reader who lands on the bare URL, with or
 * without scripting, gets somewhere.
 */
export default function RedirectRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={fontVariables}>
      <head>
        <PaletteVars />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
