'use client'

import type { Dictionary } from '@/lib/i18n'

/** Colour by family or subgroup, and endangerment hatching. Set on the map key. */
export function DisplayControls({
  strings,
  colourMode,
  onColourMode,
  hasSubgroups,
  hatching,
  onToggleHatching,
}: {
  readonly strings: Dictionary
  readonly colourMode: 'family' | 'subgroup'
  readonly onColourMode: (mode: 'family' | 'subgroup') => void
  /** Hidden when nothing in the bundle actually splits — the control would be a no-op. */
  readonly hasSubgroups: boolean
  readonly hatching: boolean
  readonly onToggleHatching: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {hasSubgroups ? (
        <div className="flex items-center gap-2">
          <span className="index-label">{strings.plate.colourBy}</span>
          <div className="flex" role="group" aria-label={strings.plate.colourBy}>
            {(['family', 'subgroup'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onColourMode(mode)}
                aria-pressed={colourMode === mode}
                className={`btn -ml-px px-2 py-1 first:ml-0 ${
                  colourMode === mode ? 'border-boundary bg-boundary text-plate' : ''
                }`}
              >
                {mode === 'family' ? strings.plate.colourByFamily : strings.plate.colourBySubgroup}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-body-s">
        <input
          type="checkbox"
          checked={hatching}
          onChange={onToggleHatching}
          className="h-4 w-4 accent-boundary"
        />
        {strings.plate.hatchingToggle}
      </label>
    </div>
  )
}
