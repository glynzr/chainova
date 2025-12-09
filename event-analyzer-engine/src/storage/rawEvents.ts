import { db } from "../config/db.js";
import type { SecurityEvent } from "../types.js";

export async function storeRawEvent(ev: SecurityEvent) {
  await db.query(
    `INSERT INTO raw_events(
      sender, receiver, amount, message, timestamp,
      block_number, gas_price, nonce, origin,
      chain_id, value, tx_hash, contract
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (tx_hash) DO NOTHING`,
    [
      ev.sender, ev.receiver, ev.amount, ev.message,
      ev.timestamp, ev.blockNumber, ev.gasPrice,
      ev.nonce, ev.origin, ev.chainId,
      ev.value, ev.txHash, ev.contract
    ]
  );
}
