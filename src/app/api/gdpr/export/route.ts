import { NextResponse } from 'next/server'

import { getGdprExportData } from '@/lib/gdpr'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const exportData = await getGdprExportData(user.id)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="fairsettle-gdpr-export-${timestamp}.json"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to generate GDPR export',
      },
      { status: 500 },
    )
  }
}
