import LocalizedAdminSentimentPage from '@/app/[locale]/admin/sentiment/page'

export default function AdminRootSentimentPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  return <LocalizedAdminSentimentPage params={{ locale: 'en' }} searchParams={searchParams} />
}
