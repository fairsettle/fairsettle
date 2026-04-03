import { ImageResponse } from 'next/og'

export const size = {
  width: 64,
  height: 64,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 18,
          background:
            'linear-gradient(145deg, rgba(240,248,246,1) 0%, rgba(222,235,231,1) 100%)',
          color: '#0f9488',
          fontSize: 34,
          fontWeight: 700,
        }}
      >
        F
      </div>
    ),
    size,
  )
}

