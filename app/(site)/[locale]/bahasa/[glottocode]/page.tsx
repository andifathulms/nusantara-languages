import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { LanguageFacts } from '@/components/panel/LanguageFacts'
import { NearestRelatives } from '@/components/panel/NearestRelatives'
import { loadBundle } from '@/lib/bundle/load'
import { relativeReport } from '@/lib/tree/relatives'
import { buildLocator, locatorIndex, type LocatorIndex } from '@/lib/plate/locator'
import { branchFigures, languageLadder, type BranchFigures } from '@/lib/plate/example'
import { colourOf, familyVarRef } from '@/lib/colour'
import { LanguageLocator } from '@/components/panel/LanguageLocator'
import { LanguageLadder } from '@/components/panel/LanguageLadder'
import { ScriptCard } from '@/components/panel/ScriptCard'
import { scriptOf } from '@/lib/scripts'
import { aesStep } from '@/lib/bundle/types'
import { LOCALES, dictionary, isLocale, localePath, type Locale } from '@/lib/i18n'
import { localeMetadata } from '@/lib/seo/locale-meta'

/**
 * One page per language, per locale — 726 languages, statically exported. The route is keyed
 * on glottocode, never on name: names are ambiguous and they change.
 */

export function generateStaticParams() {
  const { languoids } = loadBundle()
  return LOCALES.flatMap((locale) =>
    languoids.map((languoid) => ({ locale, glottocode: languoid.glottocode })),
  )
}

export const dynamicParams = false

/**
 * Branch figures for the ladder, computed once per build process rather than once per page. The
 * furthest-pair search is quadratic in branch size, and every Austronesian page climbs through two
 * 464-language branches. This file is app code, not one of the pure modules, so a process-level
 * cache is allowed here.
 */
let figures: ReadonlyMap<string, BranchFigures> | null = null
function allBranchFigures(bundle: ReturnType<typeof loadBundle>): ReadonlyMap<string, BranchFigures> {
  figures ??= branchFigures(bundle.treeIndex, bundle.byCode)
  return figures
}

/** The locator's bounds index, once per process for the same reason. */
let boundsIndex: LocatorIndex | null = null
function allBounds(bundle: ReturnType<typeof loadBundle>): LocatorIndex {
  boundsIndex ??= locatorIndex(bundle.geometry, bundle.basemap)
  return boundsIndex
}

function detailOf(glottocode: string) {
  const bundle = loadBundle()
  const languoid = bundle.byCode.get(glottocode)
  if (languoid === undefined) return null
  return {
    bundle,
    detail: {
      glottocode: languoid.glottocode,
      name: languoid.name,
      altNames: languoid.altNames,
      iso639P3: languoid.iso639P3,
      aes: languoid.aes,
      aesStep: aesStep(languoid.aes),
      med: languoid.med,
      referenceCount: languoid.referenceCount,
      lon: languoid.lon,
      lat: languoid.lat,
      geometry: languoid.geometry,
      ancestry: languoid.ancestors,
    },
  }
}

export function generateMetadata({
  params,
}: {
  params: { locale: string; glottocode: string }
}): Metadata {
  const found = detailOf(params.glottocode)
  if (found === null) return {}
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const rootCode = found.detail.ancestry[0]
  const family =
    rootCode === undefined
      ? strings.tree.isolate
      : (found.bundle.treeIndex.nodes.get(rootCode)?.name ?? rootCode)
  return {
    title: `${found.detail.name} (${found.detail.glottocode})`,
    description: `${found.detail.name} — ${strings.panel.family}: ${family}. ${strings.siteDescription}`,
    ...localeMetadata(locale, `bahasa/${found.detail.glottocode}`),
  }
}

export default function LanguagePage({
  params,
}: {
  params: { locale: string; glottocode: string }
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const found = detailOf(params.glottocode)
  if (found === null) notFound()

  const { detail, bundle } = found
  const nameOf = (code: string): string => bundle.treeIndex.nodes.get(code)?.name ?? code
  const rootCode = detail.ancestry[0]
  const report = relativeReport(bundle.treeIndex, bundle.byCode, detail.glottocode)
  const target = bundle.byCode.get(detail.glottocode)
  const colour = colourOf(bundle.colours, rootCode ?? detail.glottocode).token

  // Built here, at build time, per page — and clipped to its window, so the page carries only the
  // coastline it draws.
  const locator =
    target === undefined
      ? null
      : buildLocator({
          target,
          relatives: (report?.named ?? []).flatMap((relative) => {
            const languoid = bundle.byCode.get(relative.glottocode)
            return languoid === undefined ? [] : [languoid]
          }),
          closest: report?.closest ?? null,
          languoids: bundle.languoids,
          geometry: bundle.geometry,
          basemap: bundle.basemap,
          colours: bundle.colours,
          index: allBounds(bundle),
        })
  const script = scriptOf(detail.glottocode)
  const ladder =
    languageLadder(bundle.treeIndex, bundle.byCode, detail.glottocode, allBranchFigures(bundle)) ?? []

  return (
    <>
      <SiteHeader locale={locale} current="peta" />

      <main id="content" className="mx-auto max-w-plate px-4 py-block-lg sm:px-6 sm:py-section">
        <header className="max-w-prose">
          <p className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 border border-boundary/40"
              style={{ backgroundColor: familyVarRef(colour, 'selected') }}
            />
            <span className="index-label">
              {rootCode === undefined
                ? strings.tree.isolate
                : detail.ancestry.slice(0, 2).map(nameOf).join(' · ')}
            </span>
          </p>
          <h1 className="mt-2 font-display text-title-l sm:text-title-xl">{detail.name}</h1>
          {detail.altNames.length > 0 ? (
            <p className="mt-2 text-lead text-ink-soft">{detail.altNames.join(' · ')}</p>
          ) : null}
          <p className="mt-block">
            <Link
              href={`${localePath(locale, 'peta')}#bahasa=${detail.glottocode}`}
              className="btn btn-primary"
            >
              {strings.language.viewOnPlate}
            </Link>
          </p>
        </header>

        <div className="mt-block-lg grid gap-x-12 gap-y-block-lg lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
          {/* The map first on a phone: "where is it?" is the question a reader arrives with. */}
          <div className="order-first space-y-4 lg:sticky lg:top-6 lg:order-none lg:col-start-2 lg:row-start-1 lg:self-start">
            {locator === null ? null : (
              <figure>
                <LanguageLocator
                  locator={locator}
                  label={`${strings.language.locatorTitle}: ${detail.name}`}
                />
                <figcaption className="mt-2 text-micro text-ink-soft">
                  {detail.geometry.type === 'point' ? `${strings.language.pointOnlyNote} ` : ''}
                  {strings.language.locatorNote}
                </figcaption>
              </figure>
            )}

            {/* Computed at build time, per page, rather than carried in the plate model: the plate
                page already ships every language's ancestry and does not need a relatives report
                for 726 languages to answer a question asked about one. */}
            <NearestRelatives
              report={report}
              strings={strings}
              locale={locale}
              total={bundle.coverage.languages}
            />
          </div>

          <div className="space-y-block-lg lg:col-start-1 lg:row-start-1">
            <LanguageLadder rungs={ladder} strings={strings} locale={locale} colour={colour} />

            {script === null ? null : <ScriptCard script={script} strings={strings} locale={locale} />}

            <LanguageFacts
              detail={detail}
              strings={strings}
              locale={locale}
              manifest={bundle.manifest}
              nameOf={nameOf}
              hideClassification={ladder.length > 1}
            />

            <p className="text-body-s text-ink-soft">
              <Link href={localePath(locale, 'metode')} className="link">
                {strings.method.title}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
