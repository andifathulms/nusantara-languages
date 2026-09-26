'use client'

import { useId } from 'react'
import type { Dictionary } from '@/lib/i18n'

/**
 * Three short instructions for a first visit, dismissed once and remembered.
 *
 * They replace the paragraph that used to sit above the map. That paragraph was right for a first
 * visit and in the way on every one after it, which is why it is a dismissible strip now.
 *
 * Remembered in localStorage — a per-browser convenience, never data. A returning reader is hidden
 * before first paint by the inline script in the locale layout (TIPS_SCRIPT), so the strip never
 * flashes and then collapses.
 */

export const TIPS_STORAGE_KEY = 'nusantara:tips'

/** Runs before paint. Kept tiny and dependency-free; it makes no request (invariant 14). */
export const TIPS_SCRIPT = `try{if(localStorage.getItem('${TIPS_STORAGE_KEY}')==='off')document.documentElement.setAttribute('data-tips','off')}catch(e){}`

export function FirstVisitTips({
  strings,
  className = '',
}: {
  readonly strings: Dictionary
  readonly className?: string
}) {
  const headingId = useId()
  const dismiss = () => {
    try {
      window.localStorage.setItem(TIPS_STORAGE_KEY, 'off')
    } catch {
      // Storage refused (private mode, blocked site data): the strip still hides for this visit.
    }
    document.documentElement.setAttribute('data-tips', 'off')
  }

  const tips = [strings.workspace.tipTree, strings.workspace.tipPlate, strings.workspace.tipKey]

  return (
    <section
      aria-labelledby={headingId}
      className={`first-visit-tips ${className} flex flex-col gap-3 border border-boundary/20 bg-index/70 px-4 py-3 sm:flex-row sm:items-center`}
    >
      <h2 id={headingId} className="index-label shrink-0">
        {strings.workspace.tipsTitle}
      </h2>
      <ol className="grid flex-1 gap-x-6 gap-y-1 text-body-s sm:grid-cols-3">
        {tips.map((tip, index) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true" className="figure text-ink-soft">
              {index + 1}
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={dismiss} className="btn shrink-0 self-start sm:self-center">
        {strings.workspace.tipsDismiss}
      </button>
    </section>
  )
}
