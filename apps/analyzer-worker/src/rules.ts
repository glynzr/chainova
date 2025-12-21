import Decimal from "decimal.js";
import { type SecurityEvent, type AlertRecord, type Severity } from "@chainova/shared";

export interface RuleHit {
  ruleId: string;
  severity: Severity;
  title: string;
  reason: string;
  recommendedAction: string;
  indicators: { key: string; value: string | number | boolean }[];
}

function weiToEthApprox(wei: string): number {
  // only for display; do NOT use for precise financial logic
  const d = new Decimal(wei);
  return Number(d.div("1000000000000000000").toFixed(6));
}

/**
 * Rule-based detection (fast, deterministic).
 * Keep rules explainable: each rule returns indicators & recommended actions.
 */
export function runRules(e: SecurityEvent, context: {
  perSenderMinuteCount: number;
  uniqueReceiversInMinute: number;
  recentSameMessageCount: number;
  valueZScore?: number;
}): RuleHit[] {
  const hits: RuleHit[] = [];
  const valueEth = weiToEthApprox(e.value);

  // R001 - Spam burst: too many tx/min
  if (context.perSenderMinuteCount >= 20) {
    hits.push({
      ruleId: "R001_SPAM_BURST",
      severity: context.perSenderMinuteCount >= 60 ? "high" : "medium",
      title: "Sender transaction burst (possible spam/flood)",
      reason: `Sender exceeded ${context.perSenderMinuteCount} transactions in the last minute.`,
      recommendedAction: "Rate-limit the sender, monitor for repeated bursts, and investigate the origin address.",
      indicators: [
        { key: "tx_per_minute", value: context.perSenderMinuteCount },
        { key: "window_seconds", value: 60 },
        { key: "sender", value: e.sender },
        { key: "origin", value: e.origin },
      ],
    });
  }

  // R002 - Spray: many unique receivers in a short window
  if (context.uniqueReceiversInMinute >= 10) {
    hits.push({
      ruleId: "R002_RECEIVER_SPRAY",
      severity: context.uniqueReceiversInMinute >= 25 ? "high" : "medium",
      title: "Receiver spray pattern (one-to-many)",
      reason: `Sender contacted ${context.uniqueReceiversInMinute} unique receivers in the last minute.`,
      recommendedAction: "Check for phishing/airdrop spam. Consider temporarily flagging transactions from this sender.",
      indicators: [
        { key: "unique_receivers_per_minute", value: context.uniqueReceiversInMinute },
        { key: "sender", value: e.sender },
      ],
    });
  }

  // R003 - Repeated message payload
  if (context.recentSameMessageCount >= 8 && e.message.trim().length > 0) {
    hits.push({
      ruleId: "R003_REPEATED_PAYLOAD",
      severity: "low",
      title: "Repeated message payload (automation indicator)",
      reason: `Same message repeated ${context.recentSameMessageCount} times recently.`,
      recommendedAction: "Inspect the sender automation, and correlate with receiver spray or tx bursts.",
      indicators: [
        { key: "message", value: e.message.slice(0, 80) },
        { key: "repeat_count", value: context.recentSameMessageCount },
      ],
    });
  }

  // R004 - High value transfer
  if (valueEth >= 5) {
    hits.push({
      ruleId: "R004_HIGH_VALUE",
      severity: valueEth >= 50 ? "critical" : "high",
      title: "High value transfer",
      reason: `Transaction value is ~${valueEth} ETH (approx).`,
      recommendedAction: "Verify authorization and intent. If unexpected, consider freezing/flagging downstream actions.",
      indicators: [
        { key: "value_wei", value: e.value },
        { key: "value_eth_approx", value: valueEth },
      ],
    });
  }

  // R005 - Origin differs from sender (in EOAs it usually matches; in contract calls it differs)
  if (e.origin.toLowerCase() !== e.sender.toLowerCase()) {
    hits.push({
      ruleId: "R005_ORIGIN_MISMATCH",
      severity: "info",
      title: "tx.origin differs from msg.sender",
      reason: "This can indicate a contract-mediated call. Not necessarily malicious, but useful for investigation.",
      recommendedAction: "Correlate with other signals. If combined with bursts/sprays, prioritize review.",
      indicators: [
        { key: "sender", value: e.sender },
        { key: "origin", value: e.origin },
      ],
    });
  }

  // R006 - Anomalous value (z-score from time-series module)
  if (typeof context.valueZScore === "number" && Math.abs(context.valueZScore) >= 3) {
    hits.push({
      ruleId: "R006_VALUE_ANOMALY_ZSCORE",
      severity: Math.abs(context.valueZScore) >= 6 ? "high" : "medium",
      title: "Value anomaly (statistical outlier)",
      reason: `Value z-score is ${context.valueZScore.toFixed(2)} based on sender's recent history.`,
      recommendedAction: "Investigate whether this is a legitimate spike or potential theft/drain behavior.",
      indicators: [
        { key: "value_zscore", value: Number(context.valueZScore.toFixed(2)) },
        { key: "sender", value: e.sender },
      ],
    });
  }

  return hits;
}
