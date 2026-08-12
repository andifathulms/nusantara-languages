'use client'

import { useCallback, useState } from 'react'
import { Plate } from './Plate'
import { IndexPanel } from './IndexPanel'
import {
  NO_SELECTION,
  scopeOf,
  type PlateSelection,
} from '@/lib/plate/select'
import type { PlateModel } from '@/lib/plate/build'
import type { Coverage } from '@/lib/bundle/types'
import { format, type Dictionary } from '@/lib/i18n'

/**
 * Holds the plate's interaction state and nothing else. Hover is transient and wins while it
 * lasts; selection holds the state once hover ends. Every question about what that means for
 * a given shape is answered by lib/plate/select, which is pure and tested.
 */

type PlateViewProps = {
  readonly model: PlateModel
  readonly coverage: Coverage
  readonly strings: Dictionary
}

export function PlateView({ model, coverage, strings }: PlateViewProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selection, setSelection] = useState<PlateSelection>(NO_SELECTION)

  const scope = scopeOf(hovered, selection)
  const selectedLanguage = selection.kind === 'language' ? selection.glottocode : null

  const selectLanguage = useCallback((glottocode: string) => {
    setSelection((current) =>
      current.kind === 'language' && current.glottocode === glottocode
        ? NO_SELECTION
        : { kind: 'language', glottocode },
    )
  }, [])

  const selectBranch = useCallback((glottocode: string) => {
    setSelection((current) =>
      current.kind === 'branch' && current.glottocode === glottocode
        ? NO_SELECTION
        : { kind: 'branch', glottocode },
    )
  }, [])

  const clear = useCallback(() => {
    setSelection(NO_SELECTION)
  }, [])

  return (
    <div>
      <Plate
        model={model}
        scope={scope}
        selectedLanguage={selectedLanguage}
        onHover={setHovered}
        onSelect={selectLanguage}
        label={`${strings.plate.title} — ${format(strings.plate.coverage, {
          withPolygon: coverage.withPolygon,
          total: coverage.languages,
          percent: coverage.polygonPercent,
        })}`}
        showHatching={false}
      />

      <p className="mt-2 text-sm text-boundary/70">{strings.plate.hint}</p>

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
    </div>
  )
}
