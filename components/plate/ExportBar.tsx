'use client'

import { useState } from 'react'
import {
  captionBandHeight,
  exportFileName,
  mergeGround,
  toStandaloneSvg,
  withCaption,
  type ExportCaption,
} from '@/lib/plate/export'
import type { Dictionary } from '@/lib/i18n'

/**
 * PNG export and link sharing.
 *
 * The export rasterises the plate that is actually on screen, so what is downloaded is what
 * was selected — and because the attribution line is drawn inside the plate, the PNG carries
 * it without this code having to remember to add it. CC-BY-SA asks for that; putting it in the
 * geometry rather than in the exporter is what makes it hard to lose.
 *
 * Nothing here reaches the network: the SVG is serialised, inlined as a data URL, drawn to a
 * canvas, and handed back as a blob.
 */

type ExportBarProps = {
  readonly strings: Dictionary
  /** Finds the plate to export. The view owns the element; this only asks for it. */
  readonly getPlate: () => SVGSVGElement | null
  /** The ground layer beneath the plate — sea, coastline, graticule — merged back in. */
  readonly getGround?: () => SVGSVGElement | null
  readonly slug: string
  readonly scale?: number
  /** Sets the plate in a card with a caption band: title, selection, period. */
  readonly caption?: ExportCaption
}

export function ExportBar({
  strings,
  getPlate,
  getGround,
  slug,
  scale = 2,
  caption,
}: ExportBarProps) {
  const [state, setState] = useState<'idle' | 'working' | 'downloaded' | 'copied' | 'failed'>(
    'idle',
  )

  async function exportPng(): Promise<void> {
    const plate = getPlate()
    if (plate === null) {
      setState('failed')
      return
    }
    setState('working')

    const box = plate.viewBox.baseVal
    const width = Math.round(box.width * scale)
    const height = Math.round(box.height * scale)

    const ground = getGround?.() ?? null
    const markup = ground === null ? plate.outerHTML : mergeGround(plate.outerHTML, ground.outerHTML)
    const document_ = markup === null ? null : toStandaloneSvg(markup, {
      width,
      height,
      title: strings.plate.title,
    })
    if (document_ === null) {
      setState('failed')
      return
    }

    const card =
      caption === undefined ? document_ : withCaption(document_, { width, height }, caption)
    if (card === null) {
      setState('failed')
      return
    }
    const cardHeight = caption === undefined ? height : height + captionBandHeight(width)

    try {
      const blob = await rasterise(card, width, cardHeight)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = exportFileName(slug, new Date().toISOString().slice(0, 10))
      link.click()
      URL.revokeObjectURL(url)
      // Mirrors copyLink's confirmation: a silent success on this button and a spoken one on
      // its neighbour was a real asymmetry, not a stylistic choice — a screen-reader or
      // low-vision user otherwise has no way to know the download actually happened.
      setState('downloaded')
      window.setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('failed')
    }
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setState('copied')
      window.setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void exportPng()}
        disabled={state === 'working'}
        className="btn disabled:opacity-60"
      >
        {state === 'downloaded' ? strings.export.downloaded : strings.export.png}
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="btn"
      >
        {state === 'copied' ? strings.export.copied : strings.export.copyLink}
      </button>
      {/* Boundary ink, not accent: accent is rationed to primary action / current page /
          selection / focus ring, and a failure notice is none of those (DESIGN.md). */}
      <span aria-live="polite" className="text-body-s text-ink-soft">
        {state === 'failed' ? strings.export.failed : ''}
      </span>
    </div>
  )
}

function rasterise(svgDocument: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (context === null) {
        reject(new Error('no 2d context'))
        return
      }
      context.drawImage(image, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob === null) reject(new Error('toBlob returned nothing'))
        else resolve(blob)
      }, 'image/png')
    }
    image.onerror = () => reject(new Error('the plate could not be rasterised'))
    // A data URL rather than a blob URL: some browsers treat a blob-URL SVG as tainted and
    // then refuse toBlob on the canvas.
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDocument)}`
  })
}
