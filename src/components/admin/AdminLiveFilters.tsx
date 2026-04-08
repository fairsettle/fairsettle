'use client'

import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type AdminFilterOption = {
  label: string
  value: string
}

type AdminSelectFilter = {
  key: string
  value: string
  placeholder: string
  options: AdminFilterOption[]
  className?: string
}

type AdminSearchFilter = {
  key?: string
  placeholder: string
  value: string
  debounceMs?: number
  className?: string
}

export function AdminLiveFilters({
  search,
  selects = [],
  className,
}: {
  search?: AdminSearchFilter
  selects?: AdminSelectFilter[]
  className?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const searchKey = search?.key ?? 'search'
  const [searchValue, setSearchValue] = useState(search?.value ?? '')
  const debouncedSearchValue = useDebouncedValue(searchValue, search?.debounceMs ?? 300)

  useEffect(() => {
    setSearchValue(search?.value ?? '')
  }, [search?.value])

  const syncQueryParam = useCallback((key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (!value || value === 'all') {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }

    nextParams.delete('page')

    const query = nextParams.toString()
    const nextUrl = query ? `${pathname}?${query}` : pathname

    startTransition(() => {
      router.replace(nextUrl, { scroll: false })
    })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (!search) {
      return
    }

    const currentValue = searchParams.get(searchKey) ?? ''
    if (debouncedSearchValue === currentValue) {
      return
    }

    syncQueryParam(searchKey, debouncedSearchValue.trim())
  }, [debouncedSearchValue, search, searchKey, searchParams, syncQueryParam])

  return (
    <div className={cn('grid gap-3', className)}>
      {search ? (
        <label className={cn('relative block', search.className)}>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={search.placeholder}
            className="pl-11"
            autoComplete="off"
          />
        </label>
      ) : null}

      {selects.map((select) => (
        <Select
          key={select.key}
          value={select.value}
          onValueChange={(value) => syncQueryParam(select.key, value)}
        >
          <SelectTrigger size="sm" className={cn('w-full min-w-0 bg-white/90', select.className)}>
            <SelectValue placeholder={select.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {select.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
