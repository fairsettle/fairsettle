import type { ReactNode } from 'react'
import { buildNoIndexMetadata } from '@/lib/seo'

export const metadata = buildNoIndexMetadata()

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}

