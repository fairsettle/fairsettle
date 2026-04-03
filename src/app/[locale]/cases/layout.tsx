import type { ReactNode } from 'react'
import { buildNoIndexMetadata } from '@/lib/seo'

export const metadata = buildNoIndexMetadata()

export default function CasesLayout({ children }: { children: ReactNode }) {
  return children
}

