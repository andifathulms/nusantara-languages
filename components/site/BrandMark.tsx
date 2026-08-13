import { BRAND_INKS } from '@/lib/colour/brand'

/**
 * "Percabangan" — one ink trunk forking into three coloured leaves. The mark fuses the two
 * halves of the product into one shape: the genealogical tree and the family-coloured map.
 *
 * Inline rather than an <img>: the plate makes zero network requests at runtime and the
 * masthead is not going to be the thing that breaks that. It also means the mark inherits
 * the page's colour handling instead of arriving as a fixed raster.
 *
 * The trunk is always ink and the leaves are always maroon/teal/violet — the brand
 * signature, fixed even though the live map uses many more family colours. `BRAND_INKS`
 * keeps them out of the family palette so they can never be mistaken for data.
 *
 * Decorative by default: the masthead states the title in type right beside it, so the mark
 * is hidden from assistive technology rather than read out twice.
 */
export function BrandMark({
  className,
  title,
}: {
  className?: string
  /** Supply only where the mark stands alone with no adjacent wordmark. */
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g
        fill="none"
        stroke={BRAND_INKS.ink}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M50 88 L50 58" />
        <path d="M50 58 L28 32" />
        <path d="M50 58 L50 26" />
        <path d="M50 58 L72 32" />
      </g>
      <circle cx="28" cy="27" r="9" fill={BRAND_INKS.maroon} />
      <circle cx="50" cy="20" r="9" fill={BRAND_INKS.teal} />
      <circle cx="72" cy="27" r="9" fill={BRAND_INKS.violet} />
    </svg>
  )
}
