import { redirect } from 'next/navigation'

import { getLocalizedPath } from '@/lib/locale-path'

export default function InviteLookupPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  redirect(getLocalizedPath(locale, '/login'))
}
