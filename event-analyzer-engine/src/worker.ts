import "dotenv/config";
import { redis } from "./config/redis.js";
import { storeRawEvent } from "./storage/rawEvents.js";
import { addEventToBatch } from "./analyzer/batchManager.js";
import type { SecurityEvent } from "./types.ts";

console.log("Worker started...");

while (true) {
  const res = await redis.brpop(process.env.REDIS_EVENTS_QUEUE_KEY!, 0);
  if (!res) continue;

  const [, payload] = res;
  const ev: SecurityEvent = JSON.parse(payload);

  await storeRawEvent(ev);
  await addEventToBatch(ev);

  console.log("Processed:", ev.txHash);
}
