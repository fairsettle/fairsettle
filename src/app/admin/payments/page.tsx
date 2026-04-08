import LocalizedAdminPaymentsPage from '@/app/[locale]/admin/payments/page'

export default function AdminRootPaymentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  return <LocalizedAdminPaymentsPage params={{ locale: 'en' }} searchParams={searchParams} />
}
