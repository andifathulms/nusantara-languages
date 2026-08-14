'use client'

import type { Dictionary } from '@/lib/i18n'

/**
 * Zoom and full-screen controls, set into the plate's top-right corner the way a printed plate
 * carries its scale bar — inside the frame, small, and quiet until wanted.
 *
 * Every control is a real button with a label, because the pointer gestures behind them (drag,
 * ctrl-scroll, pinch, double-click) are all unavailable to a keyboard.
 */

type PlateControlsProps = {
  readonly strings: Dictionary
  readonly scale: number
  readonly canZoomIn: boolean
  readonly canZoomOut: boolean
  readonly isFullscreen: boolean
  readonly fullscreenAvailable: boolean
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onReset: () => void
  readonly onToggleFullscreen: () => void
}

export function PlateControls({
  strings,
  scale,
  canZoomIn,
  canZoomOut,
  isFullscreen,
  fullscreenAvailable,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleFullscreen,
}: PlateControlsProps) {
  return (
    <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
      <div className="flex flex-col border border-boundary/30 bg-plate/95 shadow-sheet">
        <ControlButton label={strings.plate.zoomIn} onClick={onZoomIn} disabled={!canZoomIn}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
            <rect x="7.1" y="3" width="1.8" height="10" />
            <rect x="3" y="7.1" width="10" height="1.8" />
          </svg>
        </ControlButton>

        <span aria-hidden="true" className="mx-1 border-t border-boundary/20" />

        <ControlButton label={strings.plate.zoomOut} onClick={onZoomOut} disabled={!canZoomOut}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
            <rect x="3" y="7.1" width="10" height="1.8" />
          </svg>
        </ControlButton>
      </div>

      {fullscreenAvailable ? (
        <ControlButton
          label={isFullscreen ? strings.plate.fullscreenExit : strings.plate.fullscreen}
          onClick={onToggleFullscreen}
          framed
        >
          {isFullscreen ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6.5 2v4.5H2M9.5 14V9.5H14M14 6.5H9.5V2M2 9.5h4.5V14" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
            </svg>
          )}
        </ControlButton>
      ) : null}

      {/* The current zoom, stated. A map that can move should say where it is — and stated
          live, because this readout is the only feedback the zoom buttons produce: pressing one
          otherwise changes nothing a screen reader would hear. */}
      {scale > 1.001 ? (
        <div
          className="flex items-center gap-1.5 border border-boundary/30 bg-plate/95 px-2 py-1 shadow-sheet"
          aria-live="polite"
        >
          <span className="figure text-micro text-ink-soft">{scale.toFixed(1)}×</span>
          {/* Ink, not accent: this is a reset link, not one of the four rationed uses
              (primary action / current page / selection / focus ring). */}
          <button
            type="button"
            onClick={onReset}
            className="font-label text-micro uppercase text-ink-soft transition-colors hover:text-accent hover:underline"
          >
            {strings.plate.zoomReset}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ControlButton({
  label,
  onClick,
  disabled = false,
  framed = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  framed?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // aria-label names it; title repeated the same string, which some screen readers then
      // announce twice. The tooltip stays because these are icon-only buttons and a sighted
      // pointer user has nothing else to go on — but the two must not both be read out.
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center text-boundary transition-colors hover:bg-boundary hover:text-plate disabled:cursor-default disabled:text-ink-soft/40 disabled:hover:bg-transparent disabled:hover:text-ink-soft/40 ${
        framed ? 'border border-boundary/30 bg-plate/95 shadow-sheet' : ''
      }`}
    >
      {children}
    </button>
  )
}
