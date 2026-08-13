import type { ExampleRung } from '@/lib/plate/example'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * The worked example the app did not have.
 *
 * Everything else that claims to teach the concept asks the reader to act first — three guided
 * cards and three toolbar chips, all links and buttons. Someone who does not yet know what a
 * language family is has nothing to *read*. This is that: one real language, climbed rung by
 * rung, with the numbers the rest of the app already computes.
 *
 * It is a table because the lesson is a comparison down a column. Each step up adds relatives
 * and widens the ground, and seeing 50 → 660 → 5,010 in a line is the argument; the same three
 * figures in a sentence are three facts.
 *
 * The caveat rides underneath rather than in a tooltip: these are floors measured between
 * recorded midpoints, and a reader being taught to trust the numbers has to be told what they
 * are on the same screen where they learn to read them.
 */
export function WorkedExample({
  rungs,
  strings,
  locale,
}: {
  readonly rungs: readonly ExampleRung[]
  readonly strings: Dictionary
  readonly locale: Locale
}) {
  const bottom = rungs[0]
  const top = rungs[rungs.length - 1]
  if (bottom === undefined || top === undefined) return null

  const number = (value: number): string => value.toLocaleString(locale)

  return (
    <section aria-labelledby="worked" className="sheet p-6 sm:p-8">
      <h2 id="worked" className="font-display text-title-m">
        {strings.guide.workedTitle}
      </h2>
      <p className="mt-3 max-w-prose text-ink-soft">{strings.guide.workedLead}</p>

      <div className="mt-block overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-left">
          <caption className="sr-only">{strings.guide.workedTitle}</caption>
          <thead>
            <tr className="border-b border-boundary/25">
              <th scope="col" className="index-label py-1.5 pr-4 font-normal">
                {strings.guide.workedLevel}
              </th>
              <th scope="col" className="index-label py-1.5 pr-4 text-right font-normal">
                {strings.guide.workedLanguages}
              </th>
              <th scope="col" className="index-label py-1.5 text-right font-normal">
                {strings.guide.workedSpan}
              </th>
            </tr>
          </thead>
          <tbody>
            {rungs.map((rung, index) => (
              <tr
                key={rung.glottocode}
                className={index === 0 ? 'border-b border-boundary/10' : ''}
              >
                {/* Indented by depth from the bottom, so the climb is visible as a shape and
                    not only as a rising number. */}
                <th scope="row" className="py-1.5 pr-4 font-normal">
                  <span style={{ paddingLeft: `${index * 0.6}rem` }} className="inline-block">
                    {rung.name}
                  </span>
                </th>
                <td className="figure py-1.5 pr-4 text-right tabular-nums">
                  {index === 0 ? (
                    <span className="text-ink-soft">{strings.guide.workedSelf}</span>
                  ) : (
                    number(rung.languageCount)
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {rung.extentKm === null ? (
                    <span aria-hidden="true" className="text-ink-soft">
                      —
                    </span>
                  ) : (
                    <>
                      <span className="figure tabular-nums">{number(rung.extentKm)} km</span>
                      {/* What the figure is the distance *between*. The plate cannot afford
                          these names on 495 rows; four rungs on one page can, and seeing it
                          once is the difference between learning the rule and being told it. */}
                      {rung.between === null ? null : (
                        <span className="block text-micro text-ink-soft">
                          {format(strings.guide.workedBetween, {
                            from: rung.between.from,
                            to: rung.between.to,
                          })}
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-block max-w-prose">
        {format(strings.guide.workedClose, {
          family: top.name,
          count: number(top.languageCount),
          km: top.extentKm === null ? '—' : number(top.extentKm),
          name: bottom.name,
        })}
      </p>
      <p className="caveat mt-3 max-w-prose">{strings.guide.workedCaveat}</p>
    </section>
  )
}
