import type { Config } from 'tailwindcss'
import { ALL_FAMILY_COLOURS, PLATE_COLOURS } from './lib/colour/palette'

const familyColours = Object.fromEntries(
  ALL_FAMILY_COLOURS.map((colour) => [
    `family-${colour.token}`,
    { DEFAULT: colour.base, selected: colour.selected },
  ]),
)

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plate: PLATE_COLOURS.plate,
        boundary: PLATE_COLOURS.boundary,
        sea: PLATE_COLOURS.sea,
        index: PLATE_COLOURS.index,
        point: PLATE_COLOURS.point,
        ...familyColours,
      },
      fontFamily: {
        // Bound to the next/font CSS variables in app/[locale]/layout.tsx.
        display: ['var(--font-display)', 'Georgia', 'serif'],
        label: ['var(--font-label)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      borderWidth: {
        hairline: '0.5px',
      },
    },
  },
  plugins: [],
}

export default config
