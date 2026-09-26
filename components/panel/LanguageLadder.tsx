import Link from 'next/link'
import type { ExampleRung } from '@/lib/plate/example'
import { format, localePath, type Dictionary, type Locale } from '@/lib/i18n'
import { familyVarRef, type FamilyColourToken } from '@/lib/colour'

/**
 * One language's ancestry as a ladder: each rung up adds relatives and widens the ground they
 * cover, which is the whole idea of a language family, shown for the language the reader came
 * to look at. Each rung links to the plate with that branch lit.
 *
 * Bars are on a log scale, and the page says so: 1 to 464 on a linear bar would draw every rung
 * below the top as nothing, which hides exactly the climb the ladder exists to show.
 */
export function LanguageLadder({
  rungs,
  strings,
  locale,
  colour,
}: {
  /** The family's palette token: every rung is the same family, in its own colour. */
  readonly colour: FamilyColourToken
  readonly rungs: readonly ExampleRung[]
  readonly strings: Dictionary
  readonly locale: Locale
}) {
  const top = rungs[rungs.length - 1]
  const max = Math.max(2, top?.languageCount ?? 2)
  const share = (count: number): number => Math.max(0.015, Math.log(count) / Math.log(max))

  return (
    <section aria-labelledby="ladder" className="sheet-quiet p-4 sm:p-5">
      <h2 id="ladder" className="index-label">
        {strings.language.ladderTitle}
      </h2>
      {rungs.length < 2 ? (
        <p className="mt-2 text-body">{strings.language.ladderIsolate}</p>
      ) : (
        <>
          <p className="mt-2 max-w-prose text-body-s text-ink-soft">{strings.language.ladderLead}</p>
          <table className="mt-3 w-full border-collapse text-left">
            <caption className="sr-only">{strings.language.ladderTitle}</caption>
            <thead>
              <tr className="border-b border-boundary/25">
                <th scope="col" className="index-label py-1.5 pr-3 font-normal">
                  {strings.guide.workedLevel}
                </th>
                <th scope="col" className="hidden py-1.5 sm:table-cell">
                  <span className="sr-only">{strings.guide.workedLanguages}</span>
                </th>
                <th scope="col" className="index-label py-1.5 pr-3 text-right font-normal">
                  {strings.guide.workedLanguages}
                </th>
                <th scope="col" className="index-label py-1.5 text-right font-normal">
                  {strings.guide.workedSpan}
                </th>
              </tr>
            </thead>
            <tbody>
              {rungs.map((rung, index) => (
                <tr key={rung.glottocode} className="border-b border-boundary/10">
                  <th scope="row" className="py-1.5 pr-3 font-normal">
                    {index === 0 ? (
                      <span className="font-medium">{rung.name}</span>
                    ) : (
                      <Link
                        href={`${localePath(locale, 'peta')}#rumpun=${rung.glottocode}`}
                        className="link-quiet"
                      >
                        {rung.name}
                      </Link>
                    )}
                  </th>
                  <td aria-hidden="true" className="hidden w-[38%] py-1.5 pr-3 sm:table-cell">
                    <span className="block h-2 bg-boundary/[0.07]">
                      <span
                        className="block h-full"
                        style={{
                          width: `${share(rung.languageCount) * 100}%`,
                          backgroundColor: familyVarRef(colour, index === 0 ? 'selected' : 'base'),
                        }}
                      />
                    </span>
                  </td>
                  <td className="figure py-1.5 pr-3 text-right text-body-s">
                    {index === 0 ? (
                      <span className="text-ink-soft">{strings.guide.workedSelf}</span>
                    ) : (
                      rung.languageCount.toLocaleString(locale)
                    )}
                  </td>
                  <td className="figure py-1.5 text-right text-body-s">
                    {rung.extentKm === null ? (
                      <span aria-hidden="true" className="text-ink-soft">
                        —
                      </span>
                    ) : (
                      `${rung.extentKm.toLocaleString(locale)} km`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="caveat mt-3 text-micro">
            {format(strings.language.ladderScale, { max: max.toLocaleString(locale) })}
          </p>
        </>
      )}
    </section>
  )
}
