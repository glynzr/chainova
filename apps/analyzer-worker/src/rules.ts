import Decimal from "decimal.js";
import { type SecurityEvent, type Severity } from "@chainova/shared";

export interface RuleHit {
  ruleId: string;
  severity: Severity;
  title: string;
  reason: string;
  recommendedAction: string;
  indicators: { key: string; value: string | number | boolean }[];
}

/**
 * Convert wei → ETH (approx, for display only)
 * DO NOT use for financial logic.
 */
function weiToEthApprox(wei: string): number {
  const d = new Decimal(wei);
  return Number(d.div("1000000000000000000").toFixed(6));
}

/**
 * Rule-based detection engine (fast, deterministic, explainable)
 */
export function runRules(
  e: SecurityEvent,
  context: {
    // existing
    perSenderMinuteCount: number;
    uniqueReceiversInMinute: number;
    recentSameMessageCount: number;
    valueZScore?: number;

    // new (for advanced rules)
    pingPongCountLastMinute?: number;
    counterparty?: string;
    uniqueSendersToReceiverInMinute?: number;
    avgGasPriceRecent?: string;
    uniqueSendersSameOriginInMinute?: number;
  }
): RuleHit[] {
  const hits: RuleHit[] = [];
  const valueEth = weiToEthApprox(e.value);


    //  R001 – Spam burst
  if (context.perSenderMinuteCount >= 20) {
    hits.push({
      ruleId: "R001_SPAM_BURST",
      severity: context.perSenderMinuteCount >= 60 ? "high" : "medium",
      title: "Sender transaction burst (possible spam/flood)",
      reason: `Sender exceeded ${context.perSenderMinuteCount} transactions in the last minute.`,
      recommendedAction:
        "Rate-limit the sender, monitor for repeated bursts, and investigate the origin address.",
      indicators: [
        { key: "tx_per_minute", value: context.perSenderMinuteCount },
        { key: "window_seconds", value: 60 },
        { key: "sender", value: e.sender },
        { key: "origin", value: e.origin },
      ],
    });
  }


    //  R002 – Receiver spray
  if (context.uniqueReceiversInMinute >= 10) {
    hits.push({
      ruleId: "R002_RECEIVER_SPRAY",
      severity: context.uniqueReceiversInMinute >= 25 ? "high" : "medium",
      title: "Receiver spray pattern (one-to-many)",
      reason: `Sender contacted ${context.uniqueReceiversInMinute} unique receivers in the last minute.`,
      recommendedAction:
        "Check for phishing or airdrop spam. Consider flagging this sender temporarily.",
      indicators: [
        { key: "unique_receivers_per_minute", value: context.uniqueReceiversInMinute },
        { key: "sender", value: e.sender },
      ],
    });
  }

    //  R003 – Repeated message payload
  if (context.recentSameMessageCount >= 8 && e.message.trim().length > 0) {
    hits.push({
      ruleId: "R003_REPEATED_PAYLOAD",
      severity: "low",
      title: "Repeated message payload (automation indicator)",
      reason: `Same message repeated ${context.recentSameMessageCount} times recently.`,
      recommendedAction:
        "Inspect sender automation and correlate with spray or burst patterns.",
      indicators: [
        { key: "message", value: e.message.slice(0, 80) },
        { key: "repeat_count", value: context.recentSameMessageCount },
      ],
    });
  }

 
    //  R004 – High value transfer
  if (valueEth >= 5) {
    hits.push({
      ruleId: "R004_HIGH_VALUE",
      severity: valueEth >= 50 ? "critical" : "high",
      title: "High value transfer",
      reason: `Transaction value is ~${valueEth} ETH (approx).`,
      recommendedAction:
        "Verify authorization and intent. Freeze or flag downstream actions if unexpected.",
      indicators: [
        { key: "value_wei", value: e.value },
        { key: "value_eth_approx", value: valueEth },
      ],
    });
  }


    //  R005 – tx.origin mismatch
  if (e.origin.toLowerCase() !== e.sender.toLowerCase()) {
    hits.push({
      ruleId: "R005_ORIGIN_MISMATCH",
      severity: "info",
      title: "tx.origin differs from msg.sender",
      reason:
        "This often indicates contract-mediated calls. Not malicious alone but useful context.",
      recommendedAction:
        "Correlate with other signals such as bursts or receiver sprays.",
      indicators: [
        { key: "sender", value: e.sender },
        { key: "origin", value: e.origin },
      ],
    });
  }

  
    //  R006 – Value anomaly (z-score)
  if (typeof context.valueZScore === "number" && Math.abs(context.valueZScore) >= 3) {
    hits.push({
      ruleId: "R006_VALUE_ANOMALY_ZSCORE",
      severity: Math.abs(context.valueZScore) >= 6 ? "high" : "medium",
      title: "Value anomaly (statistical outlier)",
      reason: `Value z-score is ${context.valueZScore.toFixed(2)} based on sender history.`,
      recommendedAction:
        "Investigate whether this spike is legitimate or indicates drain behavior.",
      indicators: [
        { key: "value_zscore", value: Number(context.valueZScore.toFixed(2)) },
        { key: "sender", value: e.sender },
      ],
    });
  }


    //  R007 – Ping-pong pattern
  if ((context.pingPongCountLastMinute ?? 0) >= 6) {
    hits.push({
      ruleId: "R007_PING_PONG_PATTERN",
      severity: (context.pingPongCountLastMinute ?? 0) >= 12 ? "high" : "medium",
      title: "Rapid back-and-forth transactions (ping-pong)",
      reason:
        `Detected ${context.pingPongCountLastMinute} alternating transactions between the same addresses.`,
      recommendedAction:
        "Investigate for wash trading, balance inflation, or bot testing.",
      indicators: [
        { key: "sender", value: e.sender },
        { key: "counterparty", value: context.counterparty ?? "unknown" },
        { key: "tx_count", value: context.pingPongCountLastMinute ?? 0 },
        { key: "window_seconds", value: 60 },
      ],
    });
  }

  
    //  R008 – Fan-in (collector)

  if ((context.uniqueSendersToReceiverInMinute ?? 0) >= 12) {
    hits.push({
      ruleId: "R008_FAN_IN_COLLECTOR",
      severity:
        (context.uniqueSendersToReceiverInMinute ?? 0) >= 30 ? "high" : "medium",
      title: "Fan-in transaction pattern (collector address)",
      reason:
        `Receiver collected transactions from ${context.uniqueSendersToReceiverInMinute} unique senders in one minute.`,
      recommendedAction:
        "Inspect for mixer, laundering aggregation, or scam funnel behavior.",
      indicators: [
        { key: "receiver", value: e.receiver },
        { key: "unique_senders", value: context.uniqueSendersToReceiverInMinute ?? 0 },
        { key: "window_seconds", value: 60 },
      ],
    });
  }


    //   R009 – Gas price spike
  if (context.avgGasPriceRecent) {
    const ratio =
      Number(e.gasPrice) / Number(context.avgGasPriceRecent || "1");

    if (ratio >= 3) {
      hits.push({
        ruleId: "R009_GAS_PRICE_SPIKE",
        severity: ratio >= 8 ? "high" : "medium",
        title: "Gas price spike (priority bidding / MEV)",
        reason: `Gas price is ${ratio.toFixed(1)}× higher than recent average.`,
        recommendedAction:
          "Investigate for MEV, frontrunning, or urgent extraction patterns.",
        indicators: [
          { key: "gas_price", value: e.gasPrice },
          { key: "avg_gas_price", value: context.avgGasPriceRecent },
          { key: "ratio", value: Number(ratio.toFixed(2)) },
        ],
      });
    }
  }


    //  R010 – Shared origin swarm

  if ((context.uniqueSendersSameOriginInMinute ?? 0) >= 8) {
    hits.push({
      ruleId: "R010_SHARED_ORIGIN_SWARM",
      severity:
        (context.uniqueSendersSameOriginInMinute ?? 0) >= 20 ? "high" : "medium",
      title: "Multiple senders controlled by same origin",
      reason:
        `Detected ${context.uniqueSendersSameOriginInMinute} senders sharing the same tx.origin.`,
      recommendedAction:
        "Investigate the controlling contract or relayer for coordinated activity.",
      indicators: [
        { key: "origin", value: e.origin },
        { key: "unique_senders", value: context.uniqueSendersSameOriginInMinute ?? 0 },
        { key: "window_seconds", value: 60 },
      ],
    });
  }

  return hits;
}
