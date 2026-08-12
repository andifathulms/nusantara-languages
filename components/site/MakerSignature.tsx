/**
 * The maker's mark: a quiet author credit, carried by the shared footer on every page.
 *
 * Deliberately kept apart from the licence attribution beside it. That one is an obligation —
 * CC-BY-SA requires it and it also lives inside the plate and the PNG export, where a layout
 * change cannot remove it. This is personal credit. The two are separated by position rather
 * than by another rule, because the footer already has its one seam and a second divider would
 * turn a signature into a section.
 *
 * Everything identifying the author sits in MAKER below, so updating a handle is a one-line
 * change and the component can be lifted into another project as it stands.
 */

const MAKER = {
  name: 'Andi Fathul Mukminin',
  portfolio: 'https://andifathulms.github.io/en/',
  links: [
    { label: 'Portfolio', href: 'https://andifathulms.github.io/en/', icon: 'globe' },
    { label: 'GitHub', href: 'https://github.com/andifathulms', icon: 'github' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/andifathulmukminin/', icon: 'linkedin' },
    { label: 'Instagram', href: 'https://www.instagram.com/andifathulms/', icon: 'instagram' },
  ],
} as const

type IconName = (typeof MAKER.links)[number]['icon']

export { MAKER }

export function MakerSignature({ className = '' }: { className?: string }) {
  // Stamped at build time, like the rest of the export.
  const year = new Date().getFullYear()

  return (
    <div className={`flex flex-col gap-2 sm:items-end ${className}`}>
      <p className="text-body-s text-ink-soft">
        Designed &amp; built by{' '}
        <a
          href={MAKER.portfolio}
          target="_blank"
          rel="noopener noreferrer"
          className="link text-boundary"
        >
          {MAKER.name}
        </a>{' '}
        <span aria-hidden="true">·</span> © <span className="figure">{year}</span>
      </p>

      <ul className="-mx-1.5 flex items-center gap-0.5">
        {MAKER.links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className="flex h-8 w-8 items-center justify-center text-ink-soft transition-colors hover:bg-boundary/5 hover:text-accent"
            >
              <Icon name={link.icon} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Inline so the footer costs no extra request — the site makes none at runtime and this is not
 * the place to start. Brand marks are drawn as filled glyphs and the globe as a stroke, which is
 * how each is normally set; at 18px the two read at the same weight.
 */
function Icon({ name }: { name: IconName }) {
  const shared = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true } as const

  switch (name) {
    case 'globe':
      return (
        <svg {...shared} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
          <circle cx="12" cy="12" r="9.25" />
          <path d="M2.75 12h18.5" />
          <path d="M12 2.75c2.42 2.6 3.78 5.9 3.78 9.25S14.42 18.65 12 21.25C9.58 18.65 8.22 15.35 8.22 12S9.58 5.35 12 2.75Z" />
        </svg>
      )
    case 'github':
      return (
        <svg {...shared} fill="currentColor">
          <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .3.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...shared} fill="currentColor">
          <path d="M22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0ZM7.12 20.45H3.55V9h3.57v11.45ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm15.11 13.02h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29Z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg {...shared} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
          <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.25" />
          <circle cx="12" cy="12" r="4.15" />
          <circle cx="17.35" cy="6.65" r="1.05" fill="currentColor" stroke="none" />
        </svg>
      )
    default: {
      const exhaustive: never = name
      return exhaustive
    }
  }
}
