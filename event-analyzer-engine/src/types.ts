export interface SecurityEvent {
  sender: string;
  receiver: string;
  amount: string;
  message: string;
  timestamp: number;
  blockNumber: number;
  gasPrice: string;
  nonce: string;
  origin: string;
  chainId: number;
  value: string;
  txHash: string;
  contract: string;
}

export interface AIAnalysisResult {
  txHash: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  indicators: string[];
  recommended_action: string;
  sender: string;
  receiver: string;
  timestamp: number;
}
