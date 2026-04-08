import 'server-only'

import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { ZodSchema } from 'zod'

let openAiClient: OpenAI | null = null

// Default to a broadly available Responses API model that supports
// both plain-text and structured outputs reliably in production.
export const DEFAULT_AI_MODEL = process.env.OPENAI_AI_MODEL ?? 'gpt-4.1-mini'

export function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  openAiClient ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  return openAiClient
}

export async function runStructuredAiRequest<T>({
  model = DEFAULT_AI_MODEL,
  schema,
  schemaName,
  systemPrompt,
  input,
  maxOutputTokens,
  timeoutMs,
}: {
  model?: string
  schema: ZodSchema<T>
  schemaName: string
  systemPrompt: string
  input: string
  maxOutputTokens: number
  timeoutMs: number
}): Promise<{
  parsed: T
  outputText: string
  inputTokens: number | null
  outputTokens: number | null
}> {
  const client = getOpenAiClient()
  const response = await withAiTimeout(
    client.responses.parse({
      model,
      instructions: systemPrompt,
      input,
      max_output_tokens: maxOutputTokens,
      text: {
        format: zodTextFormat(schema, schemaName),
      },
    }),
    timeoutMs,
  )

  return {
    parsed: response.output_parsed as T,
    outputText: response.output_text,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  }
}

export async function runTextAiRequest({
  model = DEFAULT_AI_MODEL,
  systemPrompt,
  input,
  maxOutputTokens,
  timeoutMs,
}: {
  model?: string
  systemPrompt: string
  input: string
  maxOutputTokens: number
  timeoutMs: number
}): Promise<{
  text: string
  inputTokens: number | null
  outputTokens: number | null
}> {
  const client = getOpenAiClient()
  const response = await withAiTimeout(
    client.responses.create({
      model,
      instructions: systemPrompt,
      input,
      max_output_tokens: maxOutputTokens,
    }),
    timeoutMs,
  )

  return {
    text: response.output_text.trim(),
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  }
}

export async function withAiTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('AI_REQUEST_TIMEOUT'))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}
