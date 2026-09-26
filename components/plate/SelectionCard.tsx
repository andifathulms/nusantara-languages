'use client'

import Link from 'next/link'
import { familyVarRef, type FamilyColourToken } from '@/lib/colour'
import { format, localePath, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * What is selected, said in words, directly under the plate.
 *
 * It replaced a row *above* the map that was always mounted — an empty "nothing selected" line most
 * of the time, and a height that had to be pinned so hovering the tree did not push the map up and
 * down. Below the map it can appear only when there is something to say, and moves nothing but
 * what is under it.
 *
 * The lineage is a row of buttons: each ancestor can be selected in turn, which is the tree's
 * climb made available from the map.
 */

export type SelectionSummary = {
  readonly kind: 'branch' | 'language'
  readonly glottocode: string
  readonly name: string
  readonly colour: FamilyColourToken
  /** Root first, excluding the selection itself. */
  readonly lineage: readonly { readonly glottocode: string; readonly name: string }[]
  /** For a branch. */
  readonly languageCount: number | null
  readonly extentKm: number | null
  /** For a language. */
  readonly hasArea: boolean | null
}

export function SelectionCard({
  summary,
  strings,
  locale,
  onSelectBranch,
  onClear,
  className = '',
  actions = null,
}: {
  readonly summary: SelectionSummary
  readonly strings: Dictionary
  readonly locale: Locale
  readonly onSelectBranch: (glottocode: string) => void
  readonly onClear: () => void
  readonly className?: string
  /** Further actions supplied by the view — compare, for one. */
  readonly actions?: React.ReactNode
}) {
  return (
    <section
      aria-label={summary.name}
      className={`border border-boundary/25 bg-plate px-4 py-3 shadow-sheet ${className}`}
    >
      <p className="index-label">
        {summary.kind === 'branch' ? strings.plate.selectedFamily : strings.workspace.selectedLanguage}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-3 w-3 shrink-0 translate-y-[0.1em] border border-boundary/40"
          style={{ backgroundColor: familyVarRef(summary.colour, 'selected') }}
        />
        <h2 className="min-w-0 font-display text-title-s leading-tight">{summary.name}</h2>
      </div>

      <p className="figure mt-1 text-micro text-ink-soft">
        {summary.languageCount !== null && summary.kind === 'branch'
          ? format(strings.tree.languages, { count: summary.languageCount.toLocaleString(locale) })
          : null}
        {summary.extentKm !== null ? (
          <> · {format(strings.plate.extent, { km: summary.extentKm.toLocaleString(locale) })}</>
        ) : null}
        {summary.hasArea !== null
          ? summary.hasArea
            ? strings.plate.geometryArea
            : strings.plate.geometryPoint
          : null}
      </p>

      {summary.lineage.length > 0 ? (
        <div className="mt-2">
          <p className="sr-only">{strings.workspace.lineage}</p>
          <ol className="flex flex-wrap items-center gap-1">
            {summary.lineage.map((step) => (
              <li key={step.glottocode}>
                <button
                  type="button"
                  onClick={() => onSelectBranch(step.glottocode)}
                  className="border border-boundary/25 bg-plate px-1.5 py-0.5 text-micro transition-colors hover:border-boundary hover:bg-boundary hover:text-plate"
                >
                  {step.name}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {summary.kind === 'language' ? (
          <Link
            href={localePath(locale, `bahasa/${summary.glottocode}`)}
            className="btn px-2 py-1"
          >
            {strings.panel.openLanguage}
          </Link>
        ) : null}
        {actions}
        <button type="button" onClick={onClear} className="btn px-2 py-1">
          {strings.plate.clearSelection}
        </button>
      </div>

      {summary.extentKm !== null ? (
        <p className="mt-2 border-l border-boundary/25 pl-2 text-micro text-ink-soft">
          {strings.workspace.extentShort}
        </p>
      ) : null}
    </section>
  )
}
