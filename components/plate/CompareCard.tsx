'use client'

import { familyVarRef, type FamilyColourToken } from '@/lib/colour'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * Two languages side by side, and where their lines of descent meet.
 *
 * The most direct way to show that a family is a checkable relationship rather than a colour: pick
 * Javanese and Buginese and the plate lights everything under Malayo-Polynesian; pick Javanese and
 * Ternate and it says, plainly, that no shared ancestor is on record.
 */

export type CompareSide = {
  readonly glottocode: string
  readonly name: string
  readonly familyName: string
  readonly colour: FamilyColourToken
}

export function CompareCard({
  first,
  second,
  shared,
  strings,
  locale,
  onDone,
  className = '',
}: {
  readonly first: CompareSide
  /** Null while the reader is choosing the second language. */
  readonly second: CompareSide | null
  readonly shared: { readonly name: string; readonly languageCount: number } | null
  readonly strings: Dictionary
  readonly locale: Locale
  readonly onDone: () => void
  readonly className?: string
}) {
  const side = (entry: CompareSide) => (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 shrink-0 translate-y-[0.05em] border border-boundary/40"
        style={{ backgroundColor: familyVarRef(entry.colour, 'selected') }}
      />
      <span className="truncate font-display text-body font-medium">{entry.name}</span>
    </span>
  )

  return (
    <section
      aria-label={strings.workspace.compareTitle}
      className={`border border-boundary/25 bg-plate px-4 py-3 shadow-sheet ${className}`}
    >
      <p className="index-label">{strings.workspace.compareTitle}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {side(first)}
        <span aria-hidden="true" className="figure text-ink-soft">
          ×
        </span>
        {second === null ? <span className="text-body-s text-ink-soft">…</span> : side(second)}
      </div>

      <div aria-live="polite" className="mt-2 text-body-s">
        {second === null ? (
          <p className="text-ink-soft">{format(strings.workspace.comparePick, { name: first.name })}</p>
        ) : shared === null ? (
          <p>
            {format(strings.workspace.compareNone, {
              a: first.name,
              fa: first.familyName,
              b: second.name,
              fb: second.familyName,
            })}
          </p>
        ) : (
          <>
            <p className="index-label">{strings.workspace.compareShared}</p>
            <p className="font-display text-title-s leading-tight">{shared.name}</p>
            <p className="figure text-micro text-ink-soft">
              {format(strings.workspace.compareSharedCount, {
                count: shared.languageCount.toLocaleString(locale),
              })}
            </p>
          </>
        )}
      </div>

      {second === null ? null : (
        <p className="mt-2 border-l border-boundary/25 pl-2 text-micro text-ink-soft">
          {strings.workspace.compareCaveat}
        </p>
      )}

      <div className="mt-2">
        <button type="button" onClick={onDone} className="btn px-2 py-1">
          {strings.workspace.compareDone}
        </button>
      </div>
    </section>
  )
}
