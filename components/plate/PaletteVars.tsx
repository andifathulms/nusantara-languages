import { ALL_FAMILY_COLOURS, PLATE_COLOURS, cssVariable } from '@/lib/colour'

/**
 * Emits the palette as CSS custom properties, from the same module Tailwind's tokens are
 * built from. This is why no component in the tree carries a raw hex: a shape's fill is
 * `var(--family-teal)`, and the value comes from lib/colour/palette.ts.
 */
export function PaletteVars() {
  const declarations = [
    ...ALL_FAMILY_COLOURS.flatMap((colour) => [
      `${cssVariable(colour, 'base')}: ${colour.base};`,
      `${cssVariable(colour, 'selected')}: ${colour.selected};`,
    ]),
    ...Object.entries(PLATE_COLOURS).map(([token, value]) => `--plate-${token}: ${value};`),
  ].join('')

  return <style>{`:root{${declarations}}`}</style>
}
