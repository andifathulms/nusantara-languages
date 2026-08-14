import { EB_Garamond, Fira_Sans_Condensed, IBM_Plex_Mono } from 'next/font/google'

/**
 * The three faces, defined once and shared by both root layouts.
 *
 * There are two root layouts now — one for the locale tree, one for the bare-origin redirect —
 * because a root layout owns `<html>` and only a layout inside `[locale]` can know which
 * language to declare on it. Defining the fonts here rather than in each keeps next/font
 * emitting one set of files instead of two.
 *
 * Self-hosted at build time: no font CDN, no runtime request. EB Garamond carries the old-atlas
 * register and sets an index page well; Fira Sans Condensed is the map label face; IBM Plex Mono
 * is for glottocodes, ISO codes and counts.
 */

export const display = EB_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

export const label = Fira_Sans_Condensed({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-label',
})

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-mono',
})

/** The class list every `<html>` needs, so neither root layout can forget one. */
export const fontVariables = `${display.variable} ${label.variable} ${mono.variable}`
