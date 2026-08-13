/**
 * The view state, encoded into the URL hash so a view can be shared or linked to. Pure: the
 * component reads and writes the string, this decides what it means.
 *
 * Keys are Indonesian, like the routes: `#bahasa=abui1241`, `#rumpun=aust1307`, `#arsir=1`.
 * An unrecognised key is ignored rather than treated as an error — an old link should still
 * open the map.
 */

import { NO_SELECTION, type PlateSelection } from './select'

/** Which level of the classification carries colour. */
export type ColourMode = 'family' | 'subgroup'

export type ViewState = {
  readonly selection: PlateSelection
  readonly hatching: boolean
  readonly colourMode: ColourMode
}

export const DEFAULT_VIEW: ViewState = {
  selection: NO_SELECTION,
  hatching: false,
  colourMode: 'family',
}

const GLOTTOCODE = /^[a-z0-9]{4}\d{4}$/

export function parseViewHash(hash: string): ViewState {
  const parameters = new URLSearchParams(hash.replace(/^#/, ''))

  const language = parameters.get('bahasa')
  const branch = parameters.get('rumpun')
  const selection: PlateSelection =
    language !== null && GLOTTOCODE.test(language)
      ? { kind: 'language', glottocode: language }
      : branch !== null && GLOTTOCODE.test(branch)
        ? { kind: 'branch', glottocode: branch }
        : NO_SELECTION

  return {
    selection,
    hatching: parameters.get('arsir') === '1',
    colourMode: parameters.get('warna') === 'subrumpun' ? 'subgroup' : 'family',
  }
}

export function toViewHash(state: ViewState): string {
  const parameters = new URLSearchParams()
  if (state.selection.kind === 'language') {
    parameters.set('bahasa', state.selection.glottocode)
  } else if (state.selection.kind === 'branch') {
    parameters.set('rumpun', state.selection.glottocode)
  }
  if (state.hatching) parameters.set('arsir', '1')
  if (state.colourMode === 'subgroup') parameters.set('warna', 'subrumpun')

  const encoded = parameters.toString()
  return encoded === '' ? '' : `#${encoded}`
}
