import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { DashboardWithCollapsibleSidebar } from '@/components/ui/dashboard-with-collapsible-sidebar'
import { requireAdmin } from '@/lib/admin/auth'

export default async function AdminLayout({
  children,
  params: { locale },
}: {
  children: ReactNode
  params: { locale: string }
}) {
  const admin = await requireAdmin(locale)
  const t = await getTranslations({ locale })

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-6">
      <DashboardWithCollapsibleSidebar
        brand="FairSettle"
        locale={locale}
        adminName={admin.fullName || 'Admin'}
        adminEmail={admin.email}
        backToSiteLabel={t('nav.backToSite')}
      >
        {children}
      </DashboardWithCollapsibleSidebar>
    </main>
  )
}
