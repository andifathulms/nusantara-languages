'use client'

import { useState } from 'react'
import { exportFileName, toStandaloneSvg } from '@/lib/plate/export'
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
  readonly slug: string
  readonly scale?: number
}

export function ExportBar({ strings, getPlate, slug, scale = 2 }: ExportBarProps) {
  const [state, setState] = useState<'idle' | 'working' | 'copied' | 'failed'>('idle')

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

    const document_ = toStandaloneSvg(plate.outerHTML, {
      width,
      height,
      title: strings.plate.title,
    })
    if (document_ === null) {
      setState('failed')
      return
    }

    try {
      const blob = await rasterise(document_, width, height)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = exportFileName(slug, new Date().toISOString().slice(0, 10))
      link.click()
      URL.revokeObjectURL(url)
      setState('idle')
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
        {strings.export.png}
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
