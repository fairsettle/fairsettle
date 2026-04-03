import { ImageResponse } from 'next/og'
import { SEO_SITE_NAME } from '@/lib/seo'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          background:
            'radial-gradient(circle at top, rgba(213,241,236,0.95) 0%, rgba(244,248,247,1) 52%, rgba(255,255,255,1) 100%)',
          color: '#172554',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            borderRadius: 40,
            border: '1px solid rgba(222,235,231,0.9)',
            background: 'rgba(255,255,255,0.82)',
            padding: '56px',
            boxShadow: '0 30px 80px rgba(15,23,42,0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#0f9488' }}>{SEO_SITE_NAME}</div>
            <div style={{ fontSize: 88, lineHeight: 0.98, fontWeight: 700, maxWidth: '820px' }}>
              Resolve disputes. Not in court.
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.45, maxWidth: '850px', color: '#475569' }}>
              Structured guidance for separating parents to resolve child arrangements,
              finances, and assets online.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: '#0f9488',
                color: '#ffffff',
                padding: '18px 30px',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              fairsettle.co.uk
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: '#eff7f5',
                color: '#1b2b4b',
                padding: '18px 30px',
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              From £49 to £149
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}

