'use client'

import type { Dictionary } from '@/lib/i18n'
import type { ColourMode } from '@/lib/plate/hash'

/** Colour by family or subgroup, and endangerment hatching. Set on the map key. */
export function DisplayControls({
  strings,
  colourMode,
  onColourMode,
  hasSubgroups,
  hatching,
  onToggleHatching,
  towns = false,
  onToggleTowns,
}: {
  readonly strings: Dictionary
  readonly colourMode: ColourMode
  readonly onColourMode: (mode: ColourMode) => void
  /** Hidden when nothing in the bundle actually splits — the control would be a no-op. */
  readonly hasSubgroups: boolean
  readonly hatching: boolean
  readonly onToggleHatching: () => void
  readonly towns?: boolean
  readonly onToggleTowns?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {(
        <div className="flex items-center gap-2">
          <span className="index-label">{strings.plate.colourBy}</span>
          <div className="flex" role="group" aria-label={strings.plate.colourBy}>
            {(hasSubgroups
              ? (['family', 'subgroup', 'documentation'] as const)
              : (['family', 'documentation'] as const)
            ).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onColourMode(mode)}
                aria-pressed={colourMode === mode}
                className={`btn -ml-px px-2 py-1 first:ml-0 ${
                  colourMode === mode ? 'border-boundary bg-boundary text-plate' : ''
                }`}
              >
                {mode === 'family'
                  ? strings.plate.colourByFamily
                  : mode === 'subgroup'
                    ? strings.plate.colourBySubgroup
                    : strings.docs.colourBy}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-body-s">
        <input
          type="checkbox"
          checked={hatching}
          onChange={onToggleHatching}
          className="h-4 w-4 accent-boundary"
        />
        {strings.plate.hatchingToggle}
      </label>

      {onToggleTowns === undefined ? null : (
        <label className="flex items-center gap-2 text-body-s">
          <input
            type="checkbox"
            checked={towns}
            onChange={onToggleTowns}
            className="h-4 w-4 accent-boundary"
          />
          {strings.workspace.townsToggle}
        </label>
      )}
    </div>
  )
}
