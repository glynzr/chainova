import { db } from "../config/db.js";
import type { AIAnalysisResult } from "../types.js";

export async function storeAnalysisResults(results: AIAnalysisResult[]) {
  for (const r of results) {
    await db.query(
      `INSERT INTO event_analysis(
        tx_hash, severity, reason, indicators,
        recommended_action, sender, receiver, timestamp
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (tx_hash) DO UPDATE SET
        severity = EXCLUDED.severity`,
      [
        r.txHash, r.severity, r.reason,
        JSON.stringify(r.indicators),
        r.recommended_action,
        r.sender, r.receiver, r.timestamp
      ]
    );
  }
}

export function sendAnalysisToDashboard(results: AIAnalysisResult[]) {
  console.log("DASHBOARD:", JSON.stringify(results, null, 2));
}
