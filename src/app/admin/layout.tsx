import type { ReactNode } from 'react'

import LocalizedAdminLayout from '@/app/[locale]/admin/layout'

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <LocalizedAdminLayout params={{ locale: 'en' }}>
      {children}
    </LocalizedAdminLayout>
  )
}
