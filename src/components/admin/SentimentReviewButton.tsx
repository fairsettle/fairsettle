'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { readApiErrorMessage } from '@/lib/client-errors'

export function SentimentReviewButton({
  sentimentId,
  disabled,
}: {
  sentimentId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/sentiment/${sentimentId}/review`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error((await readApiErrorMessage(response)) || 'Could not mark this flag as reviewed.')
        }

        router.refresh()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Could not mark this flag as reviewed.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={disabled || isPending}>
        {isPending ? 'Saving…' : 'Mark reviewed'}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}
