export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  sender: string;
  receiver: string;
  amount: string;         // numeric string (token amount)
  message: string;
  timestamp: number;      // unix seconds
  blockNumber: number;
  gasPrice: string;       // wei as string
  nonce: string;          // tx.origin.balance in your demo contract (uint256)
  origin: string;         // tx.origin
  chainId: number;
  value: string;          // msg.value (wei) as string
  txHash: string;
  contract: string;
}

export interface AlertIndicator {
  key: string;
  value: string | number | boolean;
}

export interface AlertRecord {
  id: string;
  createdAt: string;
  severity: Severity;
  category: "rule" | "anomaly" | "ai";
  ruleId?: string;
  title: string;
  reason: string;
  recommendedAction: string;
  sender?: string;
  receiver?: string;
  origin?: string;
  txHash?: string;
  blockNumber?: number;
  timestamp?: number;
  indicators: AlertIndicator[];
  relatedEventIds: string[];
  rawAiJson?: unknown;
}

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}
