import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { type SecurityEvent } from "@chainova/shared";

const schema = z.object({
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  title: z.string(),
  reason: z.string(),
  recommended_action: z.string(),
  indicators: z.array(z.object({
    key: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()])
  })).default([]),
});

export type AiAlert = z.infer<typeof schema>;

export async function analyzeWithGemini(input: {
  events: SecurityEvent[];
  ruleSummaries: any[];
  anomalySummaries: any[];
}): Promise<AiAlert | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const modelName = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Prompt: ask for strict JSON with the schema.
  const prompt = [
    "You are a blockchain security analyst.",
    "Given batches of on-chain SecurityEvent logs, plus rule and anomaly summaries, produce ONE consolidated alert if you see a meaningful threat pattern.",
    "If nothing suspicious beyond the provided rules/anomalies, return an alert with severity 'info' and title 'No additional AI findings'.",
    "",
    "Return ONLY valid JSON matching this TypeScript schema:",
    `{
  severity: "info"|"low"|"medium"|"high"|"critical",
  title: string,
  reason: string,
  recommended_action: string,
  indicators: Array<{key:string,value:string|number|boolean}>
}`,
    "",
    "Focus on: spam/flooding, suspicious flows (one-to-many, sudden value spikes), repeated patterns, coordination across multiple senders, and any combined signals.",
    "Be concise but specific. Reference senders/receivers/origins/blocks if relevant.",
    "",
    "INPUT JSON:",
    JSON.stringify(input),
  ].join("\n");

  const resp = await model.generateContent(prompt);
  const text = resp.response.text().trim();

  // Basic guard: parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Some models wrap JSON. Try to extract first {...}
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    parsed = JSON.parse(match[0]);
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) return null;
  return validated.data;
}
