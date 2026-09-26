import { IBM_Plex_Mono, IBM_Plex_Sans_Condensed, Newsreader } from 'next/font/google'

/**
 * The three faces, defined once and shared by both root layouts.
 *
 * There are two root layouts now — one for the locale tree, one for the bare-origin redirect —
 * because a root layout owns `<html>` and only a layout inside `[locale]` can know which
 * language to declare on it. Defining the fonts here rather than in each keeps next/font
 * emitting one set of files instead of two.
 *
 * Self-hosted at build time: no font CDN, no runtime request (invariant 14).
 *
 * Newsreader replaced EB Garamond on 2026-09-26. Garamond is beautiful at display sizes, but its
 * light stem and small x-height turned faint in the 11–13px glosses and captions this site leans
 * on — the note under a glottocode, the caveats, the attribution. Newsreader has an optical-size
 * axis, so one variable file gives display contrast at 52px and sturdier letterforms at 12px. Its
 * italic carries hydrographic names on the plate, per cartographic convention.
 *
 * IBM Plex Sans Condensed replaced Fira Sans Condensed so that the label face and the data face
 * (Plex Mono) are one design family: an index label and the figure beside it now agree.
 */

export const display = Newsreader({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-display',
})

export const label = IBM_Plex_Sans_Condensed({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-label',
})

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
})

/** The class list every `<html>` needs, so neither root layout can forget one. */
export const fontVariables = `${display.variable} ${label.variable} ${mono.variable}`
