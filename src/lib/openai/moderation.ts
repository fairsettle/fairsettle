import "server-only";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ModerationResult {
  is_flagged: boolean;
  score: number;
  flags: Record<string, boolean>;
}

export async function checkTone(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length < 10) {
    return { is_flagged: false, score: 0, flags: {} };
  }

  const response = await client.moderations.create({ input: text });
  const result = response.results[0];

  return {
    is_flagged: result.flagged,
    score: Math.max(...(Object.values(result.category_scores) as number[])),
    flags: result.categories as unknown as Record<string, boolean>,
  };
}
