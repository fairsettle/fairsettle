import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// CRITICAL: This client bypasses ALL Row Level Security.
// Use ONLY in server-side API routes that need cross-user data access.
// Never expose this client to the browser.
// Use cases: comparison generation, PDF export, cron jobs.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
