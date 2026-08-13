import type { Config } from 'tailwindcss'
import { ALL_FAMILY_COLOURS, PLATE_COLOURS } from './lib/colour/palette'

const familyColours = Object.fromEntries(
  ALL_FAMILY_COLOURS.map((colour) => [
    `family-${colour.token}`,
    { DEFAULT: colour.base, selected: colour.selected },
  ]),
)

/**
 * The type scale. EB Garamond has a small x-height and a light stem, so body text sits at
 * 17px rather than the usual 16 and leading runs long; the condensed label face is set tight
 * and tracked out, the way an engraver letters a plate.
 *
 * Sizes are named by role, not by size, so a heading cannot be chosen for how big it looks.
 */
const fontSize: Record<
  string,
  [size: string, options: { lineHeight: string; letterSpacing?: string }]
> = {
  micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
  label: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.14em' }],
  'body-s': ['0.9375rem', { lineHeight: '1.55' }],
  body: ['1.0625rem', { lineHeight: '1.65' }],
  lead: ['1.25rem', { lineHeight: '1.55' }],
  'title-s': ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.005em' }],
  'title-m': ['1.75rem', { lineHeight: '1.18', letterSpacing: '-0.01em' }],
  'title-l': ['2.5rem', { lineHeight: '1.08', letterSpacing: '-0.015em' }],
  'title-xl': ['3.25rem', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
}

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plate: PLATE_COLOURS.plate,
        boundary: PLATE_COLOURS.boundary,
        sea: PLATE_COLOURS.sea,
        index: PLATE_COLOURS.index,
        'index-deep': PLATE_COLOURS.indexDeep,
        'ink-soft': PLATE_COLOURS.inkSoft,
        accent: PLATE_COLOURS.accent,
        'accent-soft': PLATE_COLOURS.accentSoft,
        point: PLATE_COLOURS.point,
        land: PLATE_COLOURS.land,
        'land-neighbour': PLATE_COLOURS.landNeighbour,
        'land-edge': PLATE_COLOURS.landEdge,
        ...familyColours,
      },
      fontFamily: {
        // Bound to the next/font CSS variables in app/layout.tsx.
        display: ['var(--font-display)', 'Georgia', 'serif'],
        label: ['var(--font-label)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize,
      /**
       * The vertical rhythm, named by role for the same reason the type scale is: a gap should
       * be chosen for what it separates, not for how big it looks. Before this there were three
       * different section gaps in use — 64px on the front page, 48px on the plate, 40px on the
       * method page — for one role, which is drift rather than intent.
       *
       * Two section sizes survive because there are genuinely two kinds of page: a landing page
       * that breathes, and a dense reference page where a 64px gap reads as a missing section.
       */
      spacing: {
        /** Between blocks that belong to each other — a heading and the thing it introduces. */
        block: '1.5rem',
        /** Between blocks that belong together but need a beat. */
        'block-lg': '2rem',
        /** Between sections of a dense reference page. */
        section: '2.5rem',
        /** Between major sections of a landing page. */
        'section-lg': '4rem',
      },
      maxWidth: {
        // ~66 characters at the body size: the measure prose actually reads well at.
        prose: '38rem',
        plate: '96rem',
      },
      borderWidth: {
        hairline: '0.5px',
      },
      boxShadow: {
        // A sheet of paper lying on a surface, not a floating card.
        sheet: '0 1px 0 rgb(42 38 32 / 0.06), 0 8px 24px -18px rgb(42 38 32 / 0.5)',
        lifted: '0 2px 0 rgb(42 38 32 / 0.07), 0 18px 40px -28px rgb(42 38 32 / 0.55)',
      },
      transitionTimingFunction: {
        plate: 'cubic-bezier(0.2, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
