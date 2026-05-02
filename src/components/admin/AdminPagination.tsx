import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function AdminPagination({
  pathname,
  page,
  totalPages,
  searchParams,
}: {
  pathname: string
  page: number
  totalPages: number
  searchParams: Record<string, string | string[] | undefined>
}) {
  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()

    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === 'page' || value == null) return
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry))
        return
      }
      if (value !== '') {
        params.set(key, value)
      }
    })

    params.set('page', String(nextPage))
    const query = params.toString()

    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-line/80 bg-surface-soft/70 px-4 py-3">
      <p className="text-sm text-ink-soft">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <Button variant="outline" disabled>
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={buildHref(page - 1)}>Previous</Link>
          </Button>
        )}
        {page >= totalPages ? (
          <Button disabled>
            Next
          </Button>
        ) : (
          <Button asChild>
            <Link href={buildHref(page + 1)}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
