import enMessages from '../../messages/en.json'
import { NotFoundContent } from '@/components/layout/NotFoundContent'

export default function GlobalNotFound() {
  const t = enMessages.notFound

  return (
    <NotFoundContent
      badge={t.badge}
      title={t.title}
      description={t.description}
      homeLabel={t.goHome}
      backLabel={t.goBack}
      homeHref="/"
    />
  )
}

