import 'server-only'

import { ZodSchema } from 'zod'

function stripCodeFence(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export function parseAiJson<T>(text: string, schema: ZodSchema<T>): T {
  const cleaned = stripCodeFence(text)
  const parsed = JSON.parse(cleaned) as unknown
  return schema.parse(parsed)
}
