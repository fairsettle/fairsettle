import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })

export const metadata: Metadata = {
  title: 'FairSettle — Resolve disputes. Not in court.',
  description:
    'The structured, affordable way for separating parents to resolve children, money, and asset disputes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${dmSans.variable} ${fraunces.variable} min-h-full font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
