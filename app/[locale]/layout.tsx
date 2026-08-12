import { notFound } from 'next/navigation'
import { LOCALES, isLocale } from '@/lib/i18n'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export const dynamicParams = false

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound()
  // The document's lang is set on <html> for the default locale; this marks the subtree so
  // a screen reader switches pronunciation on the English pages too.
  return <div lang={params.locale}>{children}</div>
}
