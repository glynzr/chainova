import dotenv from "dotenv";
import path from "node:path";
import { WebSocketProvider, Contract } from "ethers";
import Redis from "ioredis";
import pino from "pino";
import { type SecurityEvent } from "@chainova/shared";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

const log = pino({ level: process.env.CHAINOVA_LOG_LEVEL ?? "info" });

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const RPC_WS_URL = process.env.RPC_WS_URL ?? "ws://127.0.0.1:8545";
const CONTRACT = process.env.EVENT_EMITTER_ADDRESS;

if (!CONTRACT) {
  throw new Error("EVENT_EMITTER_ADDRESS is required in .env");
}

// NOTE: we load ABI from hardhat artifacts copied by deploy script
// to keep collector decoupled from hardhat.
import abi from "./abi/EventEmitter.json" assert { type: "json" };

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

const QUEUE_KEY = "chainova:events:v1"; // Redis LIST

function normalizeEvent(args: any, event: any): SecurityEvent {
  return {
    sender: args.sender,
    receiver: args.receiver,
    amount: args.amount.toString(),
    message: args.message,
    timestamp: Number(args.timestamp),
    blockNumber: Number(args.blockNumber),
    gasPrice: args.gasPrice.toString(),
    nonce: args.nonce.toString(),
    origin: args.origin,
    chainId: Number(args.chainId),
    value: args.value.toString(),
    txHash: event.log.transactionHash,
    contract: event.log.address,
  };
}

/**
 * Latency strategy:
 * - WebSocket subscription for near-real-time delivery
 * - Minimal work in handler (serialize + RPUSH)
 * - Redis pipeline (batch push) to reduce RTT under burst load
 * - Backpressure: if Redis is slow, buffer in-memory with cap and drop (or persist to disk)
 */
const MAX_INMEM_BUFFER = 10_000;
let inmem: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;

async function flush() {
  if (inmem.length === 0) return;
  const batch = inmem.splice(0, inmem.length);
  const pipeline = redis.pipeline();
  for (const item of batch) pipeline.rpush(QUEUE_KEY, item);
  await pipeline.exec();
  log.info({ pushed: batch.length }, "flushed events to redis");
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    try {
      await flush();
    } catch (e) {
      log.error({ err: e }, "flush failed");
      // rebuffer? safest: keep data in memory (might grow). We'll cap.
      if (inmem.length > MAX_INMEM_BUFFER) {
        inmem = inmem.slice(-MAX_INMEM_BUFFER);
        log.warn({ kept: inmem.length }, "buffer capped; older events dropped");
      }
    }
  }, 50); // tiny batching window ~50ms
}

async function main() {
  const provider = new WebSocketProvider(RPC_WS_URL, undefined, {
    // Improve reconnect behavior for flaky ws:
    // ethers internally reconnects; still, we log.
    pollingInterval: 1000,
  });

  provider.on("error", (err) => log.error({ err }, "ws provider error"));
  provider.websocket?.on("close", () => log.warn("ws closed; ethers will reconnect"));

  const contract = new Contract(CONTRACT, abi, provider);

  log.info({ RPC_WS_URL, CONTRACT }, "collector started");

  contract.on("SecurityEvent", async (...allArgs: any[]) => {
    // ethers passes args + event
    const event = allArgs[allArgs.length - 1];
    const args = event.args;
    try {
      const normalized = normalizeEvent(args, event);
      const payload = JSON.stringify(normalized);
      inmem.push(payload);

      if (inmem.length > MAX_INMEM_BUFFER) {
        // drop oldest to keep memory safe
        inmem.shift();
        log.warn({ size: inmem.length }, "in-memory buffer full; dropped oldest event");
      }

      scheduleFlush();
    } catch (e) {
      log.error({ err: e }, "failed to handle event");
    }
  });

  process.on("SIGINT", async () => {
    log.info("shutting down");
    try {
      await flush();
    } finally {
      await redis.quit();
      provider.destroy();
      process.exit(0);
    }
  });
}

main().catch((e) => {
  log.error({ err: e }, "collector crashed");
  process.exit(1);
});
