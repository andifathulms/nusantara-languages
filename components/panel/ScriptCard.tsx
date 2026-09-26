import type { Script, ScriptId } from '@/lib/scripts'
import { SCRIPT_CITATION } from '@/lib/scripts'
import type { Dictionary, Locale } from '@/lib/i18n'
import {
  balineseScript,
  batakScript,
  bugineseScript,
  javaneseScript,
  rejangScript,
  sundaneseScript,
} from '../../app/fonts'

const FONT: Readonly<Record<ScriptId, string>> = {
  javanese: javaneseScript.className,
  balinese: balineseScript.className,
  sundanese: sundaneseScript.className,
  buginese: bugineseScript.className,
  batak: batakScript.className,
  rejang: rejangScript.className,
}

/**
 * The traditional script a language was written in, where the Unicode Standard names one: a
 * specimen of its letters, their transliteration, and the citation. A server component.
 */
export function ScriptCard({
  script,
  strings,
  locale,
}: {
  readonly script: Script
  readonly strings: Dictionary
  readonly locale: Locale
}) {
  return (
    <section aria-labelledby="script" className="sheet-quiet p-4 sm:p-5">
      <h2 id="script" className="index-label">
        {strings.language.scriptTitle}
      </h2>
      <p className="mt-1 font-display text-title-s">{script.name[locale]}</p>
      <p lang="und" className={`mt-3 text-title-l leading-none ${FONT[script.id]}`}>
        {script.specimen}
      </p>
      <p className="figure mt-2 text-body-s text-ink-soft">{script.transliteration}</p>
      <div className="caveat mt-3 space-y-1 text-micro">
        <p>{strings.language.scriptNote}</p>
        <p>{SCRIPT_CITATION}</p>
      </div>
    </section>
  )
}
