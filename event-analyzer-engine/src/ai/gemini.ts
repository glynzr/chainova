import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SecurityEvent, AIAnalysisResult } from "../types.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeBatchWithGemini(
  events: SecurityEvent[]
): Promise<AIAnalysisResult[]> {

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `
Analyze for:
- Spam
- Suspicious flows
- Repeated patterns
- Time-series anomalies

Return ONLY JSON array:
[
  {
    "txHash": "string",
    "severity": "low|medium|high|critical",
    "reason": "string",
    "indicators": ["string"],
    "recommended_action": "string",
    "sender": "string",
    "receiver": "string",
    "timestamp": number
  }
]

Events:
${JSON.stringify(events, null, 2)}
`;

  const res = await model.generateContent(prompt);
  const text = res.response.text();

  return JSON.parse(text);
}
