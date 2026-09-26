/**
 * Traditional scripts, hand-curated and cited. Pure data.
 *
 * Which languages each script was used for is taken from the Unicode Standard's own description of
 * the script (The Unicode Standard, Version 15.1.0, chapter 17, "Indonesia and Oceania"), and from
 * nowhere else: a language is linked to a script here only where that chapter names it. Scripts not
 * encoded in Unicode (Lampung, Kerinci's Incung) are left out, because they cannot be shown.
 *
 * The specimen is letters from the script's Unicode block, in the order the block encodes them (for
 * Javanese and Balinese that is the familiar ha-na-ca-ra-ka). It shows what the script looks like;
 * it is not a spelling of anything, so it cannot be a misspelling.
 */

export type ScriptId = 'javanese' | 'balinese' | 'sundanese' | 'buginese' | 'batak' | 'rejang'

export type Script = {
  readonly id: ScriptId
  readonly name: { readonly id: string; readonly en: string }
  /** Letters from the script's block, space-separated. */
  readonly specimen: string
  /** What the specimen reads as, letter by letter. */
  readonly transliteration: string
  /** The Unicode block, inclusive: every specimen letter falls inside it (asserted in tests). */
  readonly block: readonly [number, number]
}

export const SCRIPT_CITATION =
  'The Unicode Standard, Version 15.1.0, chapter 17 (Indonesia and Oceania). Unicode, Inc., 2023.'

export const SCRIPTS: Readonly<Record<ScriptId, Script>> = {
  javanese: {
    id: 'javanese',
    name: { id: 'Aksara Jawa (hanacaraka)', en: 'Javanese script (hanacaraka)' },
    specimen: 'ꦲ ꦤ ꦕ ꦫ ꦏ',
    transliteration: 'ha na ca ra ka',
    block: [0xa980, 0xa9df],
  },
  balinese: {
    id: 'balinese',
    name: { id: 'Aksara Bali', en: 'Balinese script' },
    specimen: 'ᬳ ᬦ ᬘ ᬭ ᬓ',
    transliteration: 'ha na ca ra ka',
    block: [0x1b00, 0x1b7f],
  },
  sundanese: {
    id: 'sundanese',
    name: { id: 'Aksara Sunda', en: 'Sundanese script' },
    specimen: 'ᮊ ᮌ ᮍ ᮎ ᮏ',
    transliteration: 'ka ga nga ca ja',
    block: [0x1b80, 0x1bbf],
  },
  buginese: {
    id: 'buginese',
    name: { id: 'Aksara Lontara', en: 'Lontara (Buginese script)' },
    specimen: 'ᨀ ᨁ ᨂ ᨃ',
    transliteration: 'ka ga nga ngka',
    block: [0x1a00, 0x1a1f],
  },
  batak: {
    id: 'batak',
    name: { id: 'Aksara Batak (surat Batak)', en: 'Batak script' },
    specimen: 'ᯀ ᯂ ᯅ ᯇ',
    transliteration: 'a ha ba pa',
    block: [0x1bc0, 0x1bff],
  },
  rejang: {
    id: 'rejang',
    name: { id: 'Aksara Rejang (kaganga)', en: 'Rejang script (kaganga)' },
    specimen: 'ꤰ ꤱ ꤲ ꤳ',
    transliteration: 'ka ga nga ta',
    block: [0xa930, 0xa95f],
  },
}

/**
 * Languages on the map and the traditional script the Unicode Standard names for each. Keyed on
 * glottocode, never on name.
 */
export const SCRIPT_OF: Readonly<Record<string, ScriptId>> = {
  java1254: 'javanese', // Javanese
  nucl1460: 'javanese', // Madurese — named in the Javanese script's description
  bali1278: 'balinese', // Balinese
  sasa1249: 'balinese', // Sasak — named in the Balinese script's description
  sund1252: 'sundanese', // Sundanese
  bugi1244: 'buginese', // Buginese
  maka1311: 'buginese', // Makasar
  mand1442: 'buginese', // Mandar
  bata1289: 'batak', // Toba
  bata1293: 'batak', // Karo
  bata1291: 'batak', // Mandailing
  bata1294: 'batak', // Dairi (Pakpak)
  bata1288: 'batak', // Simalungun
  reja1240: 'rejang', // Rejang
}

export function scriptOf(glottocode: string): Script | null {
  const id = SCRIPT_OF[glottocode]
  return id === undefined ? null : SCRIPTS[id]
}
