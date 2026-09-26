'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plate } from './Plate'
import { IndexPanel } from './IndexPanel'
import { HatchLegend } from './HatchLegend'
import { ExportBar } from './ExportBar'
import { PlateToolbar } from './PlateToolbar'
import { MapKey } from './MapKey'
import { DisplayControls } from './DisplayControls'
import { FirstVisitTips } from './FirstVisitTips'
import { DocumentationKey } from './DocumentationKey'
import { SelectionCard, type SelectionSummary } from './SelectionCard'
import { CompareCard, type CompareSide } from './CompareCard'
import { sharedAncestor } from '@/lib/tree'
import { TreeColumn } from '@/components/tree/TreeColumn'
import { LanguageFacts } from '@/components/panel/LanguageFacts'
import {
  NO_SELECTION,
  openAncestry,
  pickAt,
  scopeOf,
  toggleOpen,
  trailOf,
  type PlateSelection,
} from '@/lib/plate/select'
import { parseViewHash, toViewHash, type ColourMode } from '@/lib/plate/hash'
import type { PlateBox } from '@/lib/plate/focus'
import type { SearchEntry } from '@/lib/search'
import type { PlateModel, TreeRow } from '@/lib/plate/build'
import { atlasPeriod, type BundleManifest, type Coverage } from '@/lib/bundle/types'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * The linkage. This is the product.
 *
 * Hover a branch in the tree -> `scope` becomes that branch -> every shape whose ancestry
 * contains it saturates, everything else falls back. Click a territory on the plate -> the
 * language's ancestry is opened, so its row becomes visible, and the column scrolls to it. Both
 * directions run through the same two pieces of state and the same pure functions in
 * lib/plate/select; there is no second code path.
 *
 * Hover wins over selection while it lasts, so exploring never costs the reader their choice.
 *
 * Layout, map first. A slim row of search and examples, then the plate with the tree beside it,
 * the selection stated on a card laid over the plate's sea, and the key directly under the map
 * with the display controls on it. Everything that explains the map sits after the map.
 *
 * Below `lg` there is no room beside the plate, so the tree becomes a sheet pinned to the bottom
 * of the screen. A sheet rather than the tab it replaced: a tab hides the plate to show the tree,
 * and the binding only works when both are visible at once.
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
   * A guided view's standing emphasis. Hover or a selection overrides it, so a guided view is a
   * starting point rather than a mode the reader is stuck in.
   */
  readonly emphasis?: readonly string[]
  /** Whether the URL hash carries the view. Off inside a guided view, which owns its URL. */
  readonly syncHash?: boolean
  /** Names the exported file: `nusantara-<slug>-<date>.png`. */
  readonly slug?: string
  /** Worked examples for the toolbar, as `[label, glottocode]`. */
  readonly examples?: readonly { readonly label: string; readonly glottocode: string }[]
  /** The map key under the plate, with the display controls on it. The atlas page has it. */
  readonly showKey?: boolean
  /** The first-visit tips strip. The atlas page has it; a guided view has its own copy. */
  readonly showTips?: boolean
  /** Where the plate's frame opens on a phone, in plate x. Computed by the page, at build time. */
  readonly narrowCentreX?: number
  /** A frame to move the plate to — the guided stories drive this. */
  readonly focus?: { readonly key: string; readonly box: PlateBox | null } | null
  /** Rendered above the plate, inside the view — a guided story's steps, for one. */
  readonly beforePlate?: React.ReactNode
  /** A line per language for the hover label — the word map shows the word itself. */
  readonly hoverNotes?: Readonly<Record<string, React.ReactNode>>
  /** A further source, added to the attribution on the plate. */
  readonly attributionExtra?: string
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
  examples = [],
  showKey = false,
  showTips = false,
  narrowCentreX,
  focus = null,
  beforePlate = null,
  hoverNotes,
  attributionExtra,
}: PlateViewProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selection, setSelection] = useState<PlateSelection>(initialSelection)
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(initialOpen ?? model.rows.slice(0, 1).map((row) => row.glottocode)),
  )
  const [scrollTo, setScrollTo] = useState<string | null>(null)
  const [hatching, setHatching] = useState(initialHatching)
  const [colourMode, setColourMode] = useState<ColourMode>('family')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showTowns, setShowTowns] = useState(false)
  /** Two languages being compared. `second` is null while the reader is choosing it. */
  const [compare, setCompare] = useState<{ first: string; second: string | null } | null>(null)
  const plateRef = useRef<SVGSVGElement | null>(null)
  const groundRef = useRef<SVGSVGElement | null>(null)

  const emphasisSet = useMemo(
    () => (emphasis === undefined ? null : new Set(emphasis)),
    [emphasis],
  )

  /**
   * Node name by glottocode, from the rows already in the model. The details carry ancestry as
   * codes rather than repeating every ancestor's name per language, which was ~101 KB of the
   * payload spent saying the same thing twice. Derived here beside searchEntries, which is
   * already derived the same way from the same model.
   */
  const rowByCode = useMemo(
    () => new Map(model.rows.map((row) => [row.glottocode, row])),
    [model.rows],
  )
  const nameOf = useCallback(
    (glottocode: string): string => rowByCode.get(glottocode)?.name ?? glottocode,
    [rowByCode],
  )
  const shapeByCode = useMemo(
    () => new Map(model.shapes.map((shape) => [shape.glottocode, shape])),
    [model.shapes],
  )

  const searchEntries = useMemo<readonly SearchEntry[]>(
    () =>
      Object.values(model.details).map((detail) => ({
        glottocode: detail.glottocode,
        name: detail.name,
        altNames: detail.altNames,
        iso639P3: detail.iso639P3,
        familyName:
          detail.ancestry[0] === undefined ? strings.tree.isolate : nameOf(detail.ancestry[0]),
        hasPolygon: detail.geometry.type === 'polygon',
        colour: shapeByCode.get(detail.glottocode)?.colour,
      })),
    [model.details, nameOf, shapeByCode, strings.tree.isolate],
  )

  const scope = scopeOf(hovered, selection)
  const selectedLanguage = selection.kind === 'language' ? selection.glottocode : null

  const ancestryOf = useCallback(
    (glottocode: string): readonly string[] =>
      shapeByCode.get(glottocode)?.ancestors ?? rowByCode.get(glottocode)?.ancestors ?? [],
    [shapeByCode, rowByCode],
  )

  // The view lives in the URL hash, so a shared link opens on the view it names.
  //
  // Each *selection* is a history entry, so Back undoes a click — the reader asked for that, and
  // it is what every map they use does. Display changes (colour-by, hatching) replace the entry
  // instead, and hover never touches history at all. The entry being restored by Back, or read
  // from the link on arrival, must not be pushed again, which is what `restoring` guards.
  const restoring = useRef(true)
  const lastSelection = useRef<string | null>(null)

  const applyHash = useCallback(
    (hash: string, withDisplay: boolean) => {
      const state = parseViewHash(hash)
      const named = state.selection
      restoring.current = true
      setSelection(named)
      if (named.kind !== 'none') {
        setOpen((current) =>
          openAncestry(current, [...ancestryOf(named.glottocode), named.glottocode]),
        )
        setScrollTo(named.glottocode)
      }
      if (withDisplay) {
        if (state.hatching) setHatching(true)
        if (state.colourMode !== 'family') setColourMode(state.colourMode)
      }
    },
    [ancestryOf],
  )

  useEffect(() => {
    if (!syncHash) return
    applyHash(window.location.hash, true)
    const onPop = () => applyHash(window.location.hash, false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // Mount-only: after this, the reader's interaction and Back own the state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncHash])

  useEffect(() => {
    if (!syncHash) return
    const hash = toViewHash({ selection, hatching, colourMode })
    const url = `${window.location.pathname}${window.location.search}${hash}`
    const key = selection.kind === 'none' ? 'none' : `${selection.kind}:${selection.glottocode}`
    const changed = lastSelection.current !== null && key !== lastSelection.current
    if (changed && !restoring.current) window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
    lastSelection.current = key
    restoring.current = false
  }, [syncHash, selection, hatching, colourMode])

  /** Clicking a territory: select it, open its ancestry, scroll the tree to it. */
  const selectFromPlate = useCallback(
    (glottocode: string) => {
      // Choosing the second language of a comparison: it joins the first rather than replacing it.
      if (compare !== null && compare.second === null) {
        if (glottocode !== compare.first) {
          setCompare({ first: compare.first, second: glottocode })
          setOpen((current) => openAncestry(current, ancestryOf(glottocode)))
          setScrollTo(glottocode)
        }
        return
      }
      setSelection((current) =>
        current.kind === 'language' && current.glottocode === glottocode
          ? NO_SELECTION
          : { kind: 'language', glottocode },
      )
      setOpen((current) => openAncestry(current, ancestryOf(glottocode)))
      setScrollTo(glottocode)
    },
    [ancestryOf, compare],
  )

  /** Clicking a tree row: a language behaves like a territory, a subgroup scopes the plate. */
  const selectFromTree = useCallback((row: TreeRow) => {
    if (compare !== null && compare.second === null && row.level === 'language') {
      if (row.glottocode !== compare.first) setCompare({ first: compare.first, second: row.glottocode })
      return
    }
    setSelection((current) => {
      const kind = row.level === 'language' ? 'language' : 'branch'
      const isSame = current.kind === kind && current.glottocode === row.glottocode
      return isSame ? NO_SELECTION : { kind, glottocode: row.glottocode }
    })
    if (row.hasChildren) setOpen((current) => new Set([...current, row.glottocode]))
    setScrollTo(null)
  }, [compare])

  const selectBranch = useCallback(
    (glottocode: string) => {
      setSelection((current) =>
        current.kind === 'branch' && current.glottocode === glottocode
          ? NO_SELECTION
          : { kind: 'branch', glottocode },
      )
      // Selecting a family anywhere opens it in the tree too — the two views are one object, so
      // a choice made in either has to be visible in both.
      setOpen((current) => openAncestry(current, [...ancestryOf(glottocode), glottocode]))
      setScrollTo(glottocode)
    },
    [ancestryOf],
  )

  const toggle = useCallback((glottocode: string) => {
    setOpen((current) => toggleOpen(current, glottocode))
  }, [])

  const clear = useCallback(() => {
    setSelection(NO_SELECTION)
    setCompare(null)
    setScrollTo(null)
  }, [])

  /** A language at random, from the whole bundle with equal weight: small families come up too. */
  const allCodes = useMemo(() => Object.keys(model.details).sort(), [model.details])
  const selectRandom = useCallback(() => {
    const code = pickAt(allCodes, Math.random())
    if (code === null) return
    setCompare(null)
    setSelection({ kind: 'language', glottocode: code })
    setOpen((current) => openAncestry(current, ancestryOf(code)))
    setScrollTo(code)
  }, [allCodes, ancestryOf])

  // A comparison, once both languages are chosen: where their lines of descent meet, if anywhere.
  const pairDone = compare !== null && compare.second !== null ? compare : null
  const shared =
    pairDone === null || pairDone.second === null
      ? null
      : sharedAncestor(ancestryOf(pairDone.first), ancestryOf(pairDone.second))
  const pairEmphasis = useMemo(
    () =>
      pairDone === null || pairDone.second === null || shared !== null
        ? null
        : new Set([pairDone.first, pairDone.second]),
    [pairDone, shared],
  )
  // While comparing, the shared branch is what is lit; with no shared branch, just the two
  // languages. Hover still wins, as it always does.
  const plateScope = hovered ?? (pairDone === null ? scope : shared)
  const trail = useMemo(() => {
    const codes =
      compare === null
        ? selection.kind === 'none'
          ? []
          : [selection.glottocode]
        : [compare.first, ...(compare.second === null ? [] : [compare.second])]
    return trailOf(codes.map((code) => ({ glottocode: code, ancestors: ancestryOf(code) })))
  }, [compare, selection, ancestryOf])

  const selectedDetail = selectedLanguage === null ? undefined : model.details[selectedLanguage]

  /** The selection, in the words the card states it in. A lookup over the model, nothing more. */
  const summary = useMemo<SelectionSummary | null>(() => {
    if (selection.kind === 'none') return null
    const code = selection.glottocode
    if (selection.kind === 'branch') {
      const row = rowByCode.get(code)
      if (row === undefined) return null
      return {
        kind: 'branch',
        glottocode: code,
        name: row.name,
        colour: row.colour,
        lineage: row.ancestors.map((ancestor) => ({ glottocode: ancestor, name: nameOf(ancestor) })),
        languageCount: row.languageCount,
        extentKm: row.extentKm,
        hasArea: null,
      }
    }
    const detail = model.details[code]
    const shape = shapeByCode.get(code)
    if (detail === undefined || shape === undefined) return null
    return {
      kind: 'language',
      glottocode: code,
      name: detail.name,
      colour: colourMode === 'subgroup' ? shape.subgroupColour : shape.colour,
      lineage: detail.ancestry.map((ancestor) => ({ glottocode: ancestor, name: nameOf(ancestor) })),
      languageCount: null,
      extentKm: null,
      hasArea: detail.geometry.type === 'polygon',
    }
  }, [selection, rowByCode, model.details, shapeByCode, nameOf, colourMode])

  /** The label under the pointer: a language on the plate, never a branch hovered in the tree. */
  const hoverDetail = hovered === null ? undefined : model.details[hovered]
  const hoverCard =
    hoverDetail === undefined ? null : (
      <div className="w-max max-w-[16rem] border border-boundary/30 bg-plate/95 px-2.5 py-1.5 shadow-lifted">
        <p className="font-display text-body font-medium leading-tight">{hoverDetail.name}</p>
        {hoverNotes?.[hoverDetail.glottocode] ?? null}
        <p className="mt-0.5 text-micro text-ink-soft">
          {hoverDetail.ancestry.length === 0
            ? strings.tree.isolate
            : hoverDetail.ancestry
                .slice(0, 3)
                .map(nameOf)
                .join(' › ')}
          {hoverDetail.ancestry.length > 3 ? ' › …' : ''}
        </p>
        <p className="figure mt-0.5 text-micro text-ink-soft">
          {hoverDetail.glottocode} ·{' '}
          {hoverDetail.geometry.type === 'polygon'
            ? strings.workspace.hoverArea
            : strings.workspace.hoverPoint}
          {hoverDetail.aes === null ? '' : ` · ${strings.aes[hoverDetail.aes] ?? hoverDetail.aes}`}
        </p>
      </div>
    )

  const announcement =
    selection.kind === 'none'
      ? strings.a11y.announceCleared
      : selection.kind === 'language'
        ? format(strings.a11y.announceLanguage, {
            name: model.details[selection.glottocode]?.name ?? selection.glottocode,
          })
        : format(strings.a11y.announceBranch, {
            name: rowByCode.get(selection.glottocode)?.name ?? selection.glottocode,
            count: rowByCode.get(selection.glottocode)?.languageCount ?? 0,
          })

  const sideOf = (code: string): CompareSide | null => {
    const detail = model.details[code]
    const shape = shapeByCode.get(code)
    if (detail === undefined || shape === undefined) return null
    return {
      glottocode: code,
      name: detail.name,
      familyName: detail.ancestry[0] === undefined ? strings.tree.isolate : nameOf(detail.ancestry[0]),
      colour: shape.colour,
    }
  }

  /** The caption the exported card carries: what is on the plate, and when the sources are from. */
  const period = atlasPeriod(coverage)
  const exportCaption = {
    title: strings.plate.title,
    selection:
      compare !== null && compare.second !== null
        ? `${model.details[compare.first]?.name ?? compare.first} × ${
            model.details[compare.second]?.name ?? compare.second
          }`
        : summary === null
          ? null
          : summary.languageCount === null
            ? summary.name
            : `${summary.name} · ${format(strings.tree.languages, {
                count: summary.languageCount.toLocaleString(locale),
              })}`,
    period:
      period === null
        ? strings.plate.periodCaveat
        : format(strings.plate.periodShort, { fromYear: period.fromYear, toYear: period.toYear }),
    site: 'andifathulms.github.io/nusantara-languages',
  }

  const card = (className: string) => {
    if (compare !== null) {
      const first = sideOf(compare.first)
      if (first === null) return null
      const sharedRow = shared === null ? undefined : rowByCode.get(shared)
      return (
        <CompareCard
          first={first}
          second={compare.second === null ? null : sideOf(compare.second)}
          shared={
            sharedRow === undefined
              ? null
              : { name: sharedRow.name, languageCount: sharedRow.languageCount }
          }
          strings={strings}
          locale={locale}
          onDone={() => setCompare(null)}
          className={className}
        />
      )
    }
    return summary === null ? null : (
      <SelectionCard
        key={`${summary.kind}-${summary.glottocode}`}
        summary={summary}
        strings={strings}
        locale={locale}
        onSelectBranch={selectBranch}
        onClear={clear}
        className={className}
        actions={
          summary.kind === 'language' ? (
            <button
              type="button"
              onClick={() => setCompare({ first: summary.glottocode, second: null })}
              className="btn px-2 py-1"
            >
              {strings.workspace.compare}
            </button>
          ) : null
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <PlateToolbar
        strings={strings}
        entries={searchEntries}
        onChoose={selectFromPlate}
        onSelectBranch={selectBranch}
        examples={examples}
        onRandom={syncHash ? selectRandom : undefined}
      />

      {/* Above the map where there is room; below it on a phone, so the map comes first. The
          two render the same strip, and dismissing either hides both. */}
      {showTips ? <FirstVisitTips strings={strings} className="hidden lg:flex" /> : null}

      {beforePlate}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Two groups. The plate, its selection, export row and key are one thing — the map, and
            how to read it. The index and the endangerment legend are reference tables *about*
            the map, so they come after, separated by more space. */}
        <div className="min-w-0 space-y-block-lg">
          <div className="space-y-3">
            <Plate
              plateRef={plateRef}
              groundRef={groundRef}
              model={model}
              scope={plateScope}
              selectedLanguage={compare === null ? selectedLanguage : compare.first}
              pairedLanguage={compare?.second ?? null}
              onHover={setHovered}
              onSelect={selectFromPlate}
              label={`${strings.plate.title} — ${format(strings.plate.coverage, {
                withPolygon: coverage.withPolygon,
                total: coverage.languages,
                percent: coverage.polygonPercent,
              })}`}
              showHatching={hatching}
              colourMode={colourMode}
              emphasis={pairEmphasis ?? emphasisSet}
              strings={strings}
              narrowCentreX={narrowCentreX}
              focus={focus}
              hoverCard={hoverCard}
              english={locale === 'en'}
              showTowns={showTowns}
              attributionExtra={attributionExtra}
            />

            {/* Directly under the plate, at every width. It was laid over the plate's sea at
                first, and measured that way it covered a third of the map — in a comparison it
                hid one of the two languages being compared. Here it moves only what is below it;
                the map itself never shifts. */}
            {card('card-enter')}

            {colourMode === 'documentation' ? (
              <DocumentationKey coverage={coverage} strings={strings} locale={locale} />
            ) : null}

            {showTips ? <FirstVisitTips strings={strings} className="lg:hidden" /> : null}

            <ExportBar
              strings={strings}
              getPlate={() => plateRef.current}
              getGround={() => groundRef.current}
              slug={slug}
              caption={exportCaption}
            />

            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>

            {showKey ? (
              <MapKey
                strings={strings}
                controls={
                  <DisplayControls
                    strings={strings}
                    colourMode={colourMode}
                    onColourMode={setColourMode}
                    hasSubgroups={model.subgroupLegend.length > model.legend.length}
                    hatching={hatching}
                    onToggleHatching={() => setHatching((current) => !current)}
                    towns={showTowns}
                    onToggleTowns={() => setShowTowns((current) => !current)}
                  />
                }
              />
            ) : null}

            {/* The full facts answer the click that produced them, so they sit with the plate. */}
            {selectedDetail !== undefined ? (
              <section className="sheet p-4 sm:p-5" aria-label={selectedDetail.name}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="index-label">
                      {selectedDetail.ancestry[0] === undefined
                        ? strings.tree.isolate
                        : nameOf(selectedDetail.ancestry[0])}
                    </p>
                    <h2 className="mt-0.5 font-display text-title-m">{selectedDetail.name}</h2>
                  </div>
                  <button type="button" onClick={clear} className="btn shrink-0">
                    {strings.panel.close}
                  </button>
                </div>
                <div className="mt-4">
                  <LanguageFacts
                    detail={selectedDetail}
                    strings={strings}
                    locale={locale}
                    manifest={manifest}
                    nameOf={nameOf}
                    compact
                  />
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-4">
            <IndexPanel
              legend={colourMode === 'subgroup' ? model.subgroupLegend : model.legend}
              note={colourMode === 'subgroup' ? strings.plate.subgroupNote : null}
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
        </div>

        {/* The tree: a column beside the plate on a wide screen, a sheet pinned to the bottom of a
            narrow one. One element either way, so the tree's state and scroll position survive a
            resize. */}
        <div
          className={`tree-sheet fixed inset-x-0 bottom-0 z-30 flex flex-col border-t border-boundary/30 bg-plate shadow-lifted lg:sticky lg:top-4 lg:z-auto lg:h-[calc(100dvh-2rem)] lg:border-0 lg:bg-transparent lg:shadow-none ${
            sheetOpen ? 'h-[72dvh]' : 'h-14'
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((current) => !current)}
            aria-expanded={sheetOpen}
            className="flex h-14 shrink-0 flex-col items-center justify-center gap-1 px-4 lg:hidden"
          >
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-boundary/30" />
            <span className="flex w-full items-baseline justify-between gap-3">
              <span className="index-label text-boundary">{strings.tree.title}</span>
              <span className="min-w-0 truncate text-body-s">
                {summary === null ? '' : summary.name}
              </span>
              <span className="index-label">
                {sheetOpen ? strings.workspace.treeClose : strings.workspace.treeOpen}
              </span>
            </span>
          </button>
          <div className={`min-h-0 flex-1 lg:h-full ${sheetOpen ? '' : 'hidden lg:block'}`}>
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
              barScale={model.largestFamily}
              trail={trail}
            />
          </div>
        </div>
      </div>

      {/* Room for the pinned sheet, so it never covers the last thing on the page. */}
      <div aria-hidden="true" className="h-14 lg:hidden" />
    </div>
  )
}
