'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plate } from './Plate'
import { IndexPanel } from './IndexPanel'
import { TreeColumn } from '@/components/tree/TreeColumn'
import {
  NO_SELECTION,
  openAncestry,
  scopeOf,
  toggleOpen,
  type PlateSelection,
} from '@/lib/plate/select'
import { LanguageFacts } from '@/components/panel/LanguageFacts'
import { HatchLegend } from './HatchLegend'
import { SearchBox } from './SearchBox'
import { ExportBar } from './ExportBar'
import { parseViewHash, toViewHash } from '@/lib/plate/hash'
import type { SearchEntry } from '@/lib/search'
import type { PlateModel, TreeRow } from '@/lib/plate/build'
import type { BundleManifest, Coverage } from '@/lib/bundle/types'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * The linkage. This is the product.
 *
 * Hover a branch in the tree -> `scope` becomes that branch -> every shape whose ancestry
 * contains it saturates, everything else falls back. Click a territory on the plate ->
 * the language's ancestry is opened, so its row becomes visible, and the column scrolls to
 * it. Both directions run through the same two pieces of state and the same pure functions
 * in lib/plate/select; there is no second code path.
 *
 * Hover wins over selection while it lasts, so exploring the tree never costs the reader
 * the selection they made.
 */

type PlateViewProps = {
  readonly model: PlateModel
  readonly coverage: Coverage
  readonly strings: Dictionary
  readonly locale: Locale
  readonly manifest: BundleManifest
  /** Ancestry to open on first render, for a guided view or a shared link. */
  readonly initialOpen?: readonly string[]
  readonly initialSelection?: PlateSelection
  readonly initialHatching?: boolean
  /**
   * A guided view's standing emphasis: the isolates, the most endangered, the Papuan side of
   * the seam. Hover or a selection overrides it, so a guided view is a starting point rather
   * than a mode the reader is stuck in.
   */
  readonly emphasis?: readonly string[]
  /** Whether the URL hash carries the view. Off inside a guided view, which owns its URL. */
  readonly syncHash?: boolean
  /** Names the exported file: `nusantara-<slug>-<date>.png`. */
  readonly slug?: string
}

export function PlateView({
  model,
  coverage,
  strings,
  locale,
  manifest,
  initialOpen,
  initialSelection = NO_SELECTION,
  initialHatching = false,
  emphasis,
  syncHash = false,
  slug = 'peta',
}: PlateViewProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selection, setSelection] = useState<PlateSelection>(initialSelection)
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(initialOpen ?? model.rows.slice(0, 1).map((row) => row.glottocode)),
  )
  const [scrollTo, setScrollTo] = useState<string | null>(null)
  const [hatching, setHatching] = useState(initialHatching)
  const plateRef = useRef<SVGSVGElement | null>(null)

  const emphasisSet = useMemo(
    () => (emphasis === undefined ? null : new Set(emphasis)),
    [emphasis],
  )

  const searchEntries = useMemo<readonly SearchEntry[]>(
    () =>
      Object.values(model.details).map((detail) => ({
        glottocode: detail.glottocode,
        name: detail.name,
        altNames: detail.altNames,
        iso639P3: detail.iso639P3,
        familyName: detail.ancestry[0]?.name ?? strings.tree.isolate,
        hasPolygon: detail.geometry.type === 'polygon',
      })),
    [model.details, strings.tree.isolate],
  )

  const scope = scopeOf(hovered, selection)
  const selectedLanguage = selection.kind === 'language' ? selection.glottocode : null

  const ancestryOf = useCallback(
    (glottocode: string): readonly string[] => {
      const shape = model.shapes.find((candidate) => candidate.glottocode === glottocode)
      if (shape !== undefined) return shape.ancestors
      return model.rows.find((row) => row.glottocode === glottocode)?.ancestors ?? []
    },
    [model],
  )

  // The hash is read once on mount, so a shared link opens on the view it names, and written
  // as the reader changes it. replaceState rather than a push: the plate is one page, and the
  // back button should leave it rather than walk a history of hovers.
  useEffect(() => {
    if (!syncHash) return
    const state = parseViewHash(window.location.hash)
    const named = state.selection
    if (named.kind !== 'none') {
      setSelection(named)
      setOpen((current) => openAncestry(current, [...ancestryOf(named.glottocode), named.glottocode]))
      setScrollTo(named.glottocode)
    }
    if (state.hatching) setHatching(true)
    // Deliberately mount-only: after this, the reader's interaction owns the state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncHash])

  useEffect(() => {
    if (!syncHash) return
    const hash = toViewHash({ selection, hatching })
    const url = `${window.location.pathname}${window.location.search}${hash}`
    window.history.replaceState(null, '', url)
  }, [syncHash, selection, hatching])


  /** Clicking a territory: select it, open its ancestry, scroll the tree to it. */
  const selectFromPlate = useCallback(
    (glottocode: string) => {
      setSelection((current) =>
        current.kind === 'language' && current.glottocode === glottocode
          ? NO_SELECTION
          : { kind: 'language', glottocode },
      )
      setOpen((current) => openAncestry(current, ancestryOf(glottocode)))
      setScrollTo(glottocode)
    },
    [ancestryOf],
  )

  /** Clicking a tree row: a language behaves like a territory, a subgroup scopes the plate. */
  const selectFromTree = useCallback((row: TreeRow) => {
    setSelection((current) => {
      const kind = row.level === 'language' ? 'language' : 'branch'
      const isSame = current.kind === kind && current.glottocode === row.glottocode
      return isSame ? NO_SELECTION : { kind, glottocode: row.glottocode }
    })
    if (row.hasChildren) setOpen((current) => new Set([...current, row.glottocode]))
    setScrollTo(null)
  }, [])

  const selectBranch = useCallback(
    (glottocode: string) => {
      setSelection((current) =>
        current.kind === 'branch' && current.glottocode === glottocode
          ? NO_SELECTION
          : { kind: 'branch', glottocode },
      )
      // Selecting a family in the legend opens it in the tree too — the two views are one
      // object, so a selection made in either has to be visible in both.
      setOpen((current) => new Set([...current, glottocode]))
      setScrollTo(glottocode)
    },
    [],
  )

  const toggle = useCallback((glottocode: string) => {
    setOpen((current) => toggleOpen(current, glottocode))
  }, [])

  const clear = useCallback(() => {
    setSelection(NO_SELECTION)
    setScrollTo(null)
  }, [])

  const scopedRow = scope === null ? null : model.rows.find((row) => row.glottocode === scope)
  const announcement =
    selection.kind === 'none'
      ? strings.a11y.announceCleared
      : selection.kind === 'language'
        ? format(strings.a11y.announceLanguage, {
            name: model.details[selection.glottocode]?.name ?? selection.glottocode,
          })
        : format(strings.a11y.announceBranch, {
            name:
              model.rows.find((row) => row.glottocode === selection.glottocode)?.name ??
              selection.glottocode,
            count:
              model.rows.find((row) => row.glottocode === selection.glottocode)?.languageCount ?? 0,
          })
  const selectedDetail = selectedLanguage === null ? undefined : model.details[selectedLanguage]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0">
        <div className="mb-3 max-w-sm">
          <SearchBox entries={searchEntries} strings={strings} onChoose={selectFromPlate} />
        </div>

        <Plate
          plateRef={plateRef}
          model={model}
          scope={scope}
          selectedLanguage={selectedLanguage}
          onHover={setHovered}
          onSelect={selectFromPlate}
          label={`${strings.plate.title} — ${format(strings.plate.coverage, {
            withPolygon: coverage.withPolygon,
            total: coverage.languages,
            percent: coverage.polygonPercent,
          })}`}
          showHatching={hatching}
          emphasis={emphasisSet}
        />

        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm text-boundary/75">
          {scopedRow !== undefined && scopedRow !== null ? (
            <>
              <span className="index-label">{strings.plate.selectedFamily}</span>
              <span className="font-display text-base text-boundary">{scopedRow.name}</span>
              <span className="tabular font-mono text-xs">
                {format(strings.tree.languages, { count: scopedRow.languageCount })} ·{' '}
                {scopedRow.withPolygon} {strings.plate.geometryArea}
              </span>
            </>
          ) : (
            strings.plate.hint
          )}
        </p>

        <ExportBar strings={strings} getPlate={() => plateRef.current} slug={slug} />

        {/* Announced for a reader who is not looking at the plate: the linkage is visual, so
            the selection has to be said out loud as well as drawn. */}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {/* The panel for the selected language, above the index: it is the answer to the
            click that produced it, so it belongs next to the plate rather than on another
            page. The language page carries the same facts plus every citation. */}
        {selectedDetail !== undefined ? (
          <section
            className="mt-4 border border-boundary/30 bg-index/70 p-4"
            aria-label={selectedDetail.name}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl leading-tight">{selectedDetail.name}</h2>
              <button
                type="button"
                onClick={clear}
                className="index-label border border-boundary/40 px-2 py-1 hover:bg-boundary hover:text-plate"
              >
                {strings.panel.close}
              </button>
            </div>
            <div className="mt-3">
              <LanguageFacts
                detail={selectedDetail}
                strings={strings}
                locale={locale}
                manifest={manifest}
                compact
              />
            </div>
          </section>
        ) : null}

        <IndexPanel
          legend={model.legend}
          coverage={coverage}
          strings={strings}
          scope={scope}
          onHover={setHovered}
          onSelect={selectBranch}
          onClear={clear}
          hasSelection={selection.kind !== 'none'}
        />

        <HatchLegend
          strings={strings}
          coverage={coverage}
          enabled={hatching}
          onToggle={() => setHatching((current) => !current)}
        />
      </div>

      {/* Beside the plate, not beneath it: the linkage only works when both are visible. */}
      <div className="lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)]">
        <TreeColumn
          rows={model.rows}
          strings={strings}
          open={open}
          scope={scope}
          selected={selection.kind === 'none' ? null : selection.glottocode}
          onToggle={toggle}
          onHover={setHovered}
          onSelect={selectFromTree}
          scrollTo={scrollTo}
        />
      </div>
    </div>
  )
}
