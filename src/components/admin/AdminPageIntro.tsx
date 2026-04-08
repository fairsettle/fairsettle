import type { LucideIcon } from "lucide-react"

export function AdminPageIntro({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow?: string
  title: string
  description: string
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? <p className="app-kicker">{eyebrow}</p> : null}
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="app-icon-chip mt-1">
              <Icon className="size-5" />
            </span>
          ) : null}
          <div className="space-y-2">
            <h1 className="font-display text-4xl leading-tight text-ink sm:text-[2.75rem]">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-ink-soft">{description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
