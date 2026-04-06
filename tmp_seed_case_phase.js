const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const caseId = process.argv[2]
const role = process.argv[3]
const phase = process.argv[4]

function calcAge(dateOfBirth) {
  const referenceDate = new Date()
  const dob = new Date(dateOfBirth)
  let age = referenceDate.getUTCFullYear() - dob.getUTCFullYear()
  const monthDelta = referenceDate.getUTCMonth() - dob.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && referenceDate.getUTCDate() < dob.getUTCDate())) age -= 1
  return Math.max(age, 0)
}
function getOptions(value) {
  if (value == null || typeof value !== 'object') return []
  if (Array.isArray(value.en)) return value.en
  return []
}
function includeQuestion(question, caseType, children) {
  if (question.question_set_version !== 'v2' || !question.is_active) return false
  if (question.dispute_type !== phase) return false
  if (caseType === 'combined' && question.skip_if_combined === true) return false
  if (question.is_per_child) return true
  if (question.min_child_age == null && question.max_child_age == null) return true
  return children.some((child) => {
    const age = calcAge(child.date_of_birth)
    if (question.min_child_age != null && age < question.min_child_age) return false
    if (question.max_child_age != null && age > question.max_child_age) return false
    return true
  })
}
function makeAnswer(question) {
  const opts = getOptions(question.options)
  if (question.question_type === 'single_choice') return { value: opts[0] || 'Option 1' }
  if (question.question_type === 'multi_choice') return { value: opts.slice(0, Math.min(2, opts.length)) }
  if (question.question_type === 'number') return { value: 100 }
  if (question.question_type === 'date') return { value: '2026-04-06' }
  if (question.section === 'Living arrangements' && /town or city/i.test(question.question_text.en || '')) return { value: 'London' }
  if (question.section === 'Living arrangements' && /postcode/i.test(question.question_text.en || '')) return { value: 'SW1A 1AA' }
  return { value: 'Test answer' }
}

;(async()=>{
  const caseRes = await supabase.from('cases').select('*').eq('id', caseId).single()
  if (caseRes.error) throw caseRes.error
  const caseItem = caseRes.data
  const userId = role === 'initiator' ? caseItem.initiator_id : caseItem.responder_id
  if (!userId) throw new Error(`No user id for role ${role}`)
  const childRes = await supabase.from('children').select('*').eq('case_id', caseId).order('sort_order')
  if (childRes.error) throw childRes.error
  const children = childRes.data || []
  const qRes = await supabase.from('questions').select('*').eq('question_set_version', 'v2').eq('is_active', true)
  if (qRes.error) throw qRes.error
  const questions = (qRes.data || []).filter((q) => includeQuestion(q, caseItem.case_type, children))
  const rows = []
  for (const q of questions) {
    if (q.is_per_child) {
      for (const child of children) {
        const age = calcAge(child.date_of_birth)
        if ((q.min_child_age != null && age < q.min_child_age) || (q.max_child_age != null && age > q.max_child_age)) continue
        rows.push({ case_id: caseId, user_id: userId, question_id: q.id, child_id: child.id, answer_value: makeAnswer(q) })
      }
    } else {
      rows.push({ case_id: caseId, user_id: userId, question_id: q.id, child_id: null, answer_value: makeAnswer(q) })
    }
  }
  await supabase.from('responses').delete().eq('case_id', caseId).eq('user_id', userId).in('question_id', questions.map(q=>q.id))
  const ins = await supabase.from('responses').insert(rows)
  if (ins.error) throw ins.error
  console.log(JSON.stringify({ caseId, role, phase, inserted: rows.length }, null, 2))
})().catch((err)=>{ console.error(err); process.exit(1) })
