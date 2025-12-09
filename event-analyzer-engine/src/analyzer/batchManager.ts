import "dotenv/config";
import type { SecurityEvent } from "../types.js";
import { analyzeBatchWithGemini } from "../ai/gemini.js";
import { storeAnalysisResults, sendAnalysisToDashboard } from "../storage/analysis.js";

const MAX_EVENTS = Number(process.env.BATCH_MAX_EVENTS!);
const MAX_TIME = Number(process.env.BATCH_MAX_MS!);

let buffer: SecurityEvent[] = [];
let timer: NodeJS.Timeout | null = null;

export async function addEventToBatch(ev: SecurityEvent) {
  buffer.push(ev);

  if (!timer) {
    timer = setTimeout(() => flushBatch("timer"), MAX_TIME);
  }

  if (buffer.length >= MAX_EVENTS) {
    clearTimeout(timer!);
    timer = null;
    await flushBatch("size");
  }
}

async function flushBatch(reason: "timer" | "size") {
  if (!buffer.length) return;

  const batch = [...buffer];
  buffer = [];
  timer = null;

  console.log(`Gemini batch (${batch.length}) via ${reason}`);

  const analysis = await analyzeBatchWithGemini(batch);
  await storeAnalysisResults(analysis);
  sendAnalysisToDashboard(analysis);
}
