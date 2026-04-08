'use client'

import { Sparkles } from 'lucide-react'

export function AiDisclosure({
  title = 'AI-assisted guidance',
  body,
}: {
  title?: string
  body: string
}) {
  return (
    <aside className="app-note-warning border-l-4 border-l-warning">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning-foreground">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-warning-foreground">{body}</p>
        </div>
      </div>
    </aside>
  )
}
