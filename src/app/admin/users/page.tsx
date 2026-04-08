import LocalizedAdminUsersPage from '@/app/[locale]/admin/users/page'

export default function AdminRootUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  return <LocalizedAdminUsersPage params={{ locale: 'en' }} searchParams={searchParams} />
}
