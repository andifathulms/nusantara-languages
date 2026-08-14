import Link from 'next/link'
import { formatCoordinate } from '@/lib/geo'
import type { LanguageDetail } from '@/lib/plate/build'
import type { BundleManifest } from '@/lib/bundle/types'
import { format, localePath, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * The facts about one language, in one place: names, glottocode, ISO code, the full family
 * path, endangerment status, coordinates, whether a polygon exists and which source it came
 * from, and the citation for each source.
 *
 * It also states what is absent. There is no speaker count — Glottolog carries no reliable
 * figures and Ethnologue is not an option — and the panel says so in words rather than
 * leaving a reader to wonder whether it was forgotten.
 *
 * A server component: no interaction, so no client bundle.
 */

type LanguageFactsProps = {
  readonly detail: LanguageDetail
  /**
   * Resolves an ancestor glottocode to its name. The detail carries codes only — `rows` already
   * holds a name for every node, and carrying them twice cost ~101 KB of payload — so whoever
   * renders the chain supplies the lookup it already has.
   */
  readonly nameOf: (glottocode: string) => string
  readonly strings: Dictionary
  readonly locale: Locale
  readonly manifest?: BundleManifest
  readonly compact?: boolean
}

export function LanguageFacts({
  detail,
  nameOf,
  strings,
  locale,
  manifest,
  compact = false,
}: LanguageFactsProps) {
  const aesLabel = strings.aes[detail.aes ?? 'unknown'] ?? (detail.aes ?? 'unknown')
  const geometry = detail.geometry
  const geometrySource =
    geometry.type === 'polygon'
      ? (manifest?.sources.find((source) => source.id === geometry.source)?.title ??
        geometry.source)
      : null

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Fact
          label={strings.panel.glottocode}
          hint={compact ? undefined : strings.panel.glottocodeHint}
        >
          <span className="font-mono">{detail.glottocode}</span>
        </Fact>

        <Fact label={strings.panel.isoCode}>
          {detail.iso639P3 === null ? (
            <span className="text-ink-soft">—</span>
          ) : (
            <span className="font-mono">{detail.iso639P3}</span>
          )}
        </Fact>

        <Fact
          label={strings.panel.endangerment}
          hint={compact ? undefined : strings.panel.endangermentHint}
        >
          <span className="inline-flex items-baseline gap-2">
            <HatchSwatch step={detail.aesStep} />
            {aesLabel}
          </span>
        </Fact>

        <Fact label={strings.panel.coordinates}>
          {/* [lon, lat] in WGS 84, formatted with hemisphere letters rather than a minus. */}
          <span className="figure text-body-s">
            {formatCoordinate([detail.lon, detail.lat])}
          </span>
        </Fact>

        <Fact label={strings.panel.geometry} wide>
          {detail.geometry.type === 'polygon' ? (
            format(strings.panel.hasPolygon, { source: geometrySource ?? '' })
          ) : (
            <span>
              {strings.panel.pointOnly}. <span className="text-ink-soft">{strings.plate.pointNote}</span>
            </span>
          )}
        </Fact>

        <Fact
          label={strings.panel.classification}
          hint={
            compact || detail.ancestry.length > 0 ? undefined : strings.panel.isolateHint
          }
          wide
        >
          <span className="flex flex-wrap items-baseline gap-x-1">
            {detail.ancestry.length === 0 ? (
              <span>{strings.tree.isolate}</span>
            ) : (
              detail.ancestry.map((code, index) => (
                <span key={code}>
                  {index > 0 ? <span aria-hidden="true" className="text-ink-soft"> › </span> : null}
                  <span>{nameOf(code)}</span>
                </span>
              ))
            )}
          </span>
        </Fact>

        <Fact label={strings.panel.altNames} wide>
          {detail.altNames.length === 0 ? (
            <span className="text-ink-soft">{strings.panel.noAltNames}</span>
          ) : (
            detail.altNames.join(' · ')
          )}
        </Fact>
      </dl>

      <p className="caveat">
        {strings.panel.noSpeakerCount}
      </p>

      {compact ? (
        <Link
          href={localePath(locale, `bahasa/${detail.glottocode}`)}
          className="btn"
        >
          {strings.panel.openLanguage}
        </Link>
      ) : null}

      {!compact && manifest !== undefined ? (
        <div className="rule pt-4">
          <h2 className="index-label">{strings.panel.sources}</h2>
          <ul className="mt-2 space-y-2 text-body-s">
            {manifest.sources
              .filter((source) => source.decision === 'bundled')
              .map((source) => (
                <li key={source.id}>
                  <a href={source.homepage} className="link" rel="noreferrer">
                    {source.title}
                  </a>{' '}
                  <span className="figure text-micro">
                    {source.version} · {source.licence}
                  </span>
                  <p className="text-ink-soft">{source.citation}</p>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function Fact({
  label,
  children,
  hint,
  wide = false,
}: {
  label: string
  children: React.ReactNode
  /**
   * A gloss for a term the panel otherwise assumes. Rendered, not hovered: a tooltip is
   * invisible on touch and unsearchable, and these are exactly the words a newcomer needs.
   * Only on the full page — the compact panel beside the plate is already dense.
   */
  hint?: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="index-label">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
      {hint === undefined ? null : (
        <dd className="mt-1 text-micro text-ink-soft">{hint}</dd>
      )}
    </div>
  )
}

/**
 * Endangerment as hatch density, matching the plate. Density rises toward extinction and the
 * swatch carries no hue of its own, because hue is the family's channel.
 */
export function HatchSwatch({ step }: { step: number }) {
  const spacing = step === 0 ? 0 : 9 - (step - 1) * 1.2
  return (
    <svg width={14} height={14} aria-hidden="true" className="inline-block align-[-0.15em]">
      <rect
        x={0.5}
        y={0.5}
        width={13}
        height={13}
        fill="var(--plate-index)"
        stroke="var(--plate-boundary)"
        strokeOpacity={0.4}
      />
      {step === 0 ? null : (
        <>
          <defs>
            <pattern
              id={`swatch-hatch-${step}`}
              width={spacing}
              height={spacing}
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={spacing}
                stroke="var(--plate-boundary)"
                strokeWidth={0.4 + (step - 1) * 0.1}
              />
            </pattern>
          </defs>
          <rect x={0.5} y={0.5} width={13} height={13} fill={`url(#swatch-hatch-${step})`} />
        </>
      )}
    </svg>
  )
}
