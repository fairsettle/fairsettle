import 'server-only'

import { createHash } from 'crypto'

import { estimateAiCost } from '@/lib/ai/cost'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AiLogPayload } from '@/types/ai'
import type { Json } from '@/types/database'
import { ZodSchema } from 'zod'

function stableStringify(value: Json): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue as Json)}`)
    .join(',')}}`
}

export function createAiRequestHash(input: Json) {
  return createHash('sha256').update(stableStringify(input)).digest('hex')
}

export async function getCachedAiResponse<T>({
  caseId,
  feature,
  requestHash,
  schema,
}: {
  caseId: string
  feature: AiLogPayload['feature']
  requestHash: string
  schema?: ZodSchema<T>
}): Promise<T | null> {
  const cached = await supabaseAdmin
    .from('ai_logs')
    .select('response')
    .eq('case_id', caseId)
    .eq('feature', feature)
    .eq('request_hash', requestHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cached.data?.response) {
    return null
  }

  return schema ? schema.parse(cached.data.response) : (cached.data.response as T)
}

export async function logAiCall({
  caseId,
  userId,
  feature,
  model,
  inputTokens,
  outputTokens,
  costEstimate,
  input,
  requestHash,
  response,
}: AiLogPayload) {
  await supabaseAdmin.from('ai_logs').insert({
    case_id: caseId ?? null,
    user_id: userId ?? null,
    feature,
    model,
    input_tokens: inputTokens ?? null,
    output_tokens: outputTokens ?? null,
    cost_estimate:
      costEstimate ??
      estimateAiCost({
        feature,
        inputTokens,
        outputTokens,
      }),
    input: input ?? null,
    request_hash: requestHash ?? null,
    response,
  })
}
