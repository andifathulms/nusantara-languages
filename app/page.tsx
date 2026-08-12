import Link from 'next/link'
import { DEFAULT_LOCALE, dictionary, localePath } from '@/lib/i18n'

const strings = dictionary(DEFAULT_LOCALE)
const target = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${localePath(DEFAULT_LOCALE, 'peta')}/`

/**
 * The root only forwards to the default locale. A static export has no server to redirect,
 * so this is a meta refresh with a real link behind it — which is also what a reader with
 * scripting disabled gets.
 */
export const metadata = {
  title: strings.siteTitle,
  other: { refresh: `0; url=${target}` },
}

export default function RootPage() {
  return (
    <main className="mx-auto max-w-[60ch] px-5 py-16">
      <h1 className="font-display text-3xl">{strings.siteTitle}</h1>
      <p className="mt-4">
        <Link href={localePath(DEFAULT_LOCALE, 'peta')} className="underline">
          {strings.home.openPlate}
        </Link>
      </p>
    </main>
  )
}
