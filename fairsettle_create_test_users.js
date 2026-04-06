const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const runId = String(Date.now())
const users = [
  {
    email: `fairsettle.v3rerun.a.${runId}@mailinator.com`,
    password: 'Test12345!',
    profile: {
      full_name: 'FairSettle V3 Rerun Parent A',
      preferred_language: 'en',
      role: 'initiator',
      parent_role: 'mum',
      children_count: 2,
      privacy_consent: true,
      privacy_consent_at: new Date().toISOString(),
    },
    children: [
      { first_name: 'Mia', date_of_birth: '2018-06-12', sort_order: 0 },
      { first_name: 'Leo', date_of_birth: '2021-09-03', sort_order: 1 },
    ],
  },
  {
    email: `fairsettle.v3rerun.b.${runId}@mailinator.com`,
    password: 'Test12345!',
    profile: {
      full_name: 'FairSettle V3 Rerun Parent B',
      preferred_language: 'en',
      role: 'responder',
      parent_role: 'dad',
      children_count: 2,
      privacy_consent: true,
      privacy_consent_at: new Date().toISOString(),
    },
    children: [
      { first_name: 'Mia', date_of_birth: '2018-06-12', sort_order: 0 },
      { first_name: 'Leo', date_of_birth: '2021-09-03', sort_order: 1 },
    ],
  },
]

;(async()=>{
  const created = []
  for (const entry of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: entry.email,
      password: entry.password,
      email_confirm: true,
      user_metadata: { full_name: entry.profile.full_name },
    })
    if (error) throw error
    const user = data.user
    const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, email: entry.email, ...entry.profile })
    if (profileError) throw profileError
    for (const child of entry.children) {
      const { error: childError } = await supabase.from('children').insert({ owner_user_id: user.id, profile_id: user.id, case_id: null, source_profile_child_id: null, ...child })
      if (childError) throw childError
    }
    created.push({ email: entry.email, password: entry.password, id: user.id })
  }
  console.log(JSON.stringify({ runId, users: created }, null, 2))
})().catch((err)=>{ console.error(err); process.exit(1) })
