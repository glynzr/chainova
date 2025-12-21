import "dotenv/config";
import Redis from "ioredis";
import pino from "pino";
import { prisma } from "@chainova/db";
import { type SecurityEvent } from "@chainova/shared";
import { runRules } from "./rules.js";
import { TimeSeriesState } from "./timeseries.js";
import { BatchManager } from "./batcher.js";
import { analyzeWithGemini } from "./ai.js";

function toBigIntSafe(v: unknown): bigint {
  if (typeof v === "bigint") return v;

  if (typeof v === "string") return BigInt(v);

  if (typeof v === "number") return BigInt(v);

  if (
    typeof v === "object" &&
    v !== null &&
    "$type" in v &&
    (v as any).$type === "BigInt" &&
    "value" in v
  ) {
    return BigInt((v as any).value);
  }

  throw new Error(`Invalid BigInt value: ${JSON.stringify(v)}`);
}

const log = pino({ level: process.env.CHAINOVA_LOG_LEVEL ?? "info" });

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const QUEUE_KEY = "chainova:events:v1";

const maxEvents = Number(process.env.BATCH_MAX_EVENTS ?? "100");
const maxMs = Number(process.env.BATCH_MAX_MS ?? String(10 * 60_000));

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const ts = new TimeSeriesState();

// In-memory minute windows for fast rule context
type MinuteKey = string; // `${minute}:${sender}`
const perSenderMinuteCount = new Map<MinuteKey, number>();
const perSenderMinuteReceivers = new Map<MinuteKey, Set<string>>();
const perSenderMessageCounts = new Map<string, number>(); // sender+message hash -> count (recent-ish)

function key(minute: number, sender: string) {
  return `${minute}:${sender.toLowerCase()}`;
}

function bumpContext(e: SecurityEvent) {
  const minute = Math.floor(e.timestamp / 60);
  const k = key(minute, e.sender);
  perSenderMinuteCount.set(k, (perSenderMinuteCount.get(k) ?? 0) + 1);

  const rk = perSenderMinuteReceivers.get(k) ?? new Set<string>();
  rk.add(e.receiver.toLowerCase());
  perSenderMinuteReceivers.set(k, rk);

  const mk = `${e.sender.toLowerCase()}::${e.message}`;
  perSenderMessageCounts.set(mk, (perSenderMessageCounts.get(mk) ?? 0) + 1);

  // Simple cleanup to prevent unbounded growth
  if (perSenderMinuteCount.size > 50_000) {
    // drop oldest-ish by random deletion (cheap)
    for (const k2 of perSenderMinuteCount.keys()) { perSenderMinuteCount.delete(k2); break; }
  }
  if (perSenderMinuteReceivers.size > 50_000) {
    for (const k2 of perSenderMinuteReceivers.keys()) { perSenderMinuteReceivers.delete(k2); break; }
  }
  if (perSenderMessageCounts.size > 100_000) {
    for (const k2 of perSenderMessageCounts.keys()) { perSenderMessageCounts.delete(k2); break; }
  }

  return { minute };
}

async function storeRaw(e: SecurityEvent) {
  // Insert raw event; ignore duplicates by txHash
  return prisma.rawEvent.upsert({
    where: { txHash: e.txHash },
   create: {
  txHash: e.txHash,
  contract: e.contract,
  sender: e.sender,
  receiver: e.receiver,
  origin: e.origin,

  amount: toBigIntSafe(e.amount),
value: toBigIntSafe(e.value),
gasPrice: toBigIntSafe(e.gasPrice),
nonce: toBigIntSafe(e.nonce),

  timestamp: e.timestamp,
  blockNumber: e.blockNumber,
  chainId: e.chainId,
}
,
    update: {}, // no-op
  });
}

async function storeAlert(payload: {
  severity: string;
  category: string;
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
  indicators: any[];
  relatedEventIds: string[];
  rawAiJson?: any;
  eventId?: string;
}) {
  return prisma.alert.create({
    data: {
      severity: payload.severity,
      category: payload.category,
      ruleId: payload.ruleId,
      title: payload.title,
      reason: payload.reason,
      recommendedAction: payload.recommendedAction,
      sender: payload.sender,
      receiver: payload.receiver,
      origin: payload.origin,
      txHash: payload.txHash,
      blockNumber: payload.blockNumber,
      timestamp: payload.timestamp,
      indicators: payload.indicators,
      relatedEventIds: payload.relatedEventIds,
      rawAiJson: payload.rawAiJson,
      eventId: payload.eventId,
    },
  });
}

async function persistMinuteStat(minute: number, sender: string) {
  const k = key(minute, sender);
  const count = perSenderMinuteCount.get(k) ?? 0;
  const receivers = perSenderMinuteReceivers.get(k) ?? new Set<string>();

  await prisma.minuteStat.upsert({
    where: { minute_actor: { minute, actor: sender } },
    create: {
      minute,
      actor: sender,
      txCount: count,
      uniqueReceivers: receivers.size,
      totalValue: 0 as any, // optional (kept simple)
    },
    update: {
      txCount: count,
      uniqueReceivers: receivers.size,
    },
  });
}

const batcher = new BatchManager(
  { maxEvents, maxMs },
  async (events) => {
    // Build summaries for AI call
    const ruleSummaries: any[] = [];
    const anomalySummaries: any[] = [];

    for (const e of events) {
      const minute = Math.floor(e.timestamp / 60);
      const ctxKey = key(minute, e.sender);

      const count = perSenderMinuteCount.get(ctxKey) ?? 0;
      const receivers = perSenderMinuteReceivers.get(ctxKey) ?? new Set<string>();
      const mk = `${e.sender.toLowerCase()}::${e.message}`;
      const msgCount = perSenderMessageCounts.get(mk) ?? 0;

      const tsRes = ts.update(e);
      const hits = runRules(e, {
        perSenderMinuteCount: count,
        uniqueReceiversInMinute: receivers.size,
        recentSameMessageCount: msgCount,
        valueZScore: tsRes.valueZScore,
      });

      // Store alerts for each hit
      const storedEvent = await prisma.rawEvent.findUnique({ where: { txHash: e.txHash } });
      const relatedEventId = storedEvent?.id ? [storedEvent.id] : [];

      for (const h of hits) {
        await storeAlert({
          severity: h.severity,
          category: "rule",
          ruleId: h.ruleId,
          title: h.title,
          reason: h.reason,
          recommendedAction: h.recommendedAction,
          sender: e.sender,
          receiver: e.receiver,
          origin: e.origin,
          txHash: e.txHash,
          blockNumber: e.blockNumber,
          timestamp: e.timestamp,
          indicators: h.indicators,
          relatedEventIds: relatedEventId,
          eventId: storedEvent?.id,
        });
        ruleSummaries.push({ txHash: e.txHash, ruleId: h.ruleId, severity: h.severity, indicators: h.indicators });
      }

      if (typeof tsRes.valueZScore === "number") {
        anomalySummaries.push({ txHash: e.txHash, sender: e.sender, valueZScore: tsRes.valueZScore });
      }

      // Persist minute stats occasionally
      if (count % 10 === 0) {
        await persistMinuteStat(minute, e.sender);
      }
    }

    // Optional AI: one consolidated alert per batch
    const ai = await analyzeWithGemini({
      events,
      ruleSummaries,
      anomalySummaries,
    });

    if (ai) {
      await storeAlert({
        severity: ai.severity,
        category: "ai",
        title: ai.title,
        reason: ai.reason,
        recommendedAction: ai.recommended_action,
        indicators: ai.indicators,
        relatedEventIds: [],
        rawAiJson: ai,
      });
    }

    log.info({ batchEvents: events.length, aiEnabled: !!process.env.GEMINI_API_KEY }, "batch processed");
  }
);

async function main() {
  log.info({ REDIS_URL, QUEUE_KEY }, "analyzer worker started");

  while (true) {
    // BRPOP blocks until an item exists (low CPU).
    const res = await redis.brpop(QUEUE_KEY, 0);
    if (!res) continue;

    const [, payload] = res;
    let e: SecurityEvent;
    try {
      e = JSON.parse(payload);
    } catch (err) {
      log.warn({ err }, "invalid event JSON");
      continue;
    }

    bumpContext(e);

    // Store raw fast (I/O). If you need even lower latency,
    // you can batch DB inserts (createMany) but this is fine for demo scale.
    try {
      await storeRaw(e);
    } catch (err) {
      // If raw insert fails, do not crash; continue processing.
      log.error({ err, txHash: e.txHash }, "failed to store raw event");
    }

    batcher.add(e);

    // tick the batch manager frequently without blocking the loop too long
    // (we keep it awaited to avoid overlapping flushes; for higher throughput use a queue)
    try {
      await batcher.tick();
    } catch (err) {
      log.error({ err }, "batch flush failed");
    }
  }
}

main().catch((e) => {
  log.error({ err: e }, "worker crashed");
  process.exit(1);
});
