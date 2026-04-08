import LocalizedAdminCasesPage from '@/app/[locale]/admin/cases/page'

export default function AdminRootCasesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  return <LocalizedAdminCasesPage params={{ locale: 'en' }} searchParams={searchParams} />
}
