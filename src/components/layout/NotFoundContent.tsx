import Link from 'next/link'
import { ArrowLeft, Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

type NotFoundContentProps = {
  badge: string
  title: string
  description: string
  homeLabel: string
  backLabel: string
  homeHref: string
}

export function NotFoundContent({
  badge,
  title,
  description,
  homeLabel,
  backLabel,
  homeHref,
}: NotFoundContentProps) {
  return (
    <main className="app-shell px-5 py-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <section className="app-panel-brand overflow-hidden px-6 py-10 text-center sm:px-8 sm:py-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
            <div className="app-chip h-14 w-14 justify-center rounded-2xl px-0 shadow-sm">
              <Compass className="size-6" />
            </div>
            <p className="app-kicker">{badge}</p>
            <div className="space-y-3">
              <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>
              <p className="mx-auto max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
                {description}
              </p>
            </div>

            <div className="flex w-full flex-col justify-center gap-3 pt-2 sm:w-auto sm:flex-row">
              <Button asChild className="h-12 px-6 text-base" size="lg">
                <Link href={homeHref}>
                  <Home className="mr-2 size-4" />
                  {homeLabel}
                </Link>
              </Button>
              <Button
                className="h-12 px-6 text-base"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.history.back()
                  }
                }}
                size="lg"
                type="button"
                variant="outline"
              >
                <ArrowLeft className="mr-2 size-4" />
                {backLabel}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

