import { getTranslations } from 'next-intl/server'
import { NotFoundContent } from '@/components/layout/NotFoundContent'
import { getLocalizedPath } from '@/lib/locale-path'

export default async function LocaleNotFound({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations({ locale, namespace: 'notFound' })

  return (
    <NotFoundContent
      badge={t('badge')}
      title={t('title')}
      description={t('description')}
      homeLabel={t('goHome')}
      backLabel={t('goBack')}
      homeHref={getLocalizedPath(locale, '/')}
    />
  )
}

