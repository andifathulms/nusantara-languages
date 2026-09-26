'use client'

import { useEffect, useRef, useState } from 'react'
import type { TourStop } from '@/lib/plate/tour'
import { prefersReducedMotion } from '@/lib/dom/motion'
import { familyVarRef } from '@/lib/colour'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * The front page's plate, lighting one family after another.
 *
 * The still itself is server-rendered and passed in as children; this component only flips
 * `data-lit` on the wrapper, and the stylesheet from lib/plate/tour does the rest, so the tour
 * costs one attribute change every 2.8 seconds and no re-render of the plate.
 *
 * It stops for good the moment the reader engages — pointer down, focus, or the pause button —
 * because a map that keeps changing under someone who is trying to read it is hostile. Under
 * prefers-reduced-motion it never starts; the button still steps through by hand.
 *
 * The chip is not a live region: an announcement every 2.8 seconds would be noise. The same names
 * are in the tree and the index on the plate page.
 */

const INTERVAL_MS = 2800

export function HeroTour({
  stops,
  strings,
  locale,
  children,
  className = '',
}: {
  readonly stops: readonly TourStop[]
  readonly strings: Dictionary
  readonly locale: Locale
  readonly children: React.ReactNode
  readonly className?: string
}) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const button = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!prefersReducedMotion()) setPlaying(true)
  }, [])

  useEffect(() => {
    if (!playing || stops.length < 2) return
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % stops.length),
      INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [playing, stops.length])

  /** The reader engaged with the plate. The button is the one control that must not count. */
  const halt = (event: React.SyntheticEvent) => {
    if (button.current !== null && button.current.contains(event.target as Node)) return
    setPlaying(false)
  }

  const stop = stops[index]
  if (stop === undefined) return <div className={className}>{children}</div>

  return (
    <div
      className={`hero-plate relative ${className}`}
      data-lit={stop.glottocode}
      onPointerDown={halt}
      onFocusCapture={halt}
    >
      {children}
      {/* Over the Indian Ocean where there is room; under the plate on a phone, where a chip this
          size would cover most of the map. */}
      <div className="flex max-w-full items-center gap-2 border-t border-boundary/25 bg-plate/95 py-1 pl-2.5 pr-1 text-body-s sm:absolute sm:bottom-4 sm:left-4 sm:max-w-[calc(100%-2rem)] sm:border sm:shadow-sheet">
        <span
          aria-hidden="true"
          className="inline-block h-3 w-3 shrink-0 border border-boundary/40"
          style={{ backgroundColor: familyVarRef(stop.colour, 'selected') }}
        />
        <span className="min-w-0 truncate">
          <span className="hidden text-ink-soft sm:inline">{strings.home.tourNow}: </span>
          <span className="font-medium">{stop.name}</span>
          <span className="figure ml-2 text-micro text-ink-soft">
            {format(strings.tree.languages, { count: stop.languageCount.toLocaleString(locale) })}
            {stop.extentKm === null ? '' : ` · ${stop.extentKm.toLocaleString(locale)} km`}
          </span>
        </span>
        <button
          ref={button}
          type="button"
          onClick={() => {
            if (playing) setPlaying(false)
            // Under reduced motion the tour never runs by itself: one step per press instead.
            else if (prefersReducedMotion()) setIndex((current) => (current + 1) % stops.length)
            else setPlaying(true)
          }}
          className="btn shrink-0 px-2 py-0.5"
        >
          {playing ? strings.home.tourPause : strings.home.tourPlay}
        </button>
      </div>
    </div>
  )
}
