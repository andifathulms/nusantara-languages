/**
 * The reduced-motion preference, read at the moment it is needed.
 *
 * This module touches the DOM on purpose, which is why it is `lib/dom` and not one of the
 * three modules the invariants keep pure — `lib/newick`, `lib/tree` and `lib/geo` stay
 * testable in Node and nothing here should ever be imported into them.
 *
 * Why this exists at all: the CSS guard in globals.css sets `scroll-behavior: auto` under
 * `prefers-reduced-motion: reduce`, and that covers every scroll the browser initiates. It does
 * *not* cover a `behavior` option passed to `scrollIntoView` or `scrollTo`, because the argument
 * overrides the CSS property. Any JS-initiated scroll has to ask separately, and this is the
 * one place that asks.
 *
 * Read per call rather than cached: the preference can change mid-session, and a user who turns
 * it on should not have to reload to be believed.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** `scrollIntoView` options that respect the preference. */
export function scrollBehaviour(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}
