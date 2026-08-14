import Link from 'next/link'
import { DEFAULT_LOCALE, dictionary, localePath } from '@/lib/i18n'

const strings = dictionary(DEFAULT_LOCALE)
const target = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${localePath(DEFAULT_LOCALE)}/`

/**
 * The root only forwards to the default locale. A static export has no server to redirect,
 * so this is a meta refresh with a real link behind it — which is also what a reader with
 * scripting disabled gets.
 *
 * It forwards to the front page, not straight to the plate. The plate is written for someone
 * who already knows what this is; the front page is written for someone who does not, and a
 * stranger arriving at the bare URL is the second reader. Sending them into the middle of the
 * tool meant every explanation the project owns sat on a page nobody reached.
 */
export const metadata = {
  title: strings.siteTitle,
  other: { refresh: `0; url=${target}` },
}

export default function RootPage() {
  return (
    <main className="mx-auto max-w-[60ch] px-5 py-section-lg">
      <h1 className="font-display text-title-l">{strings.siteTitle}</h1>
      <p className="mt-4">
        <Link href={localePath(DEFAULT_LOCALE)} className="underline">
          {strings.home.enter}
        </Link>
      </p>
    </main>
  )
}
