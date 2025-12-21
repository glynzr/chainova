# Chainova — Blockchain Security Monitoring Dashboard (Monorepo)

This repo contains a complete working demo of:

- Hardhat local blockchain + `SecurityEvent` emitter contract
- **Event Collector (TypeScript)** subscribing via WebSocket and pushing events into **Redis**
- **Analyzer Worker (TypeScript)** consuming events, storing raw logs in **PostgreSQL**, running:
  - Rule-based detection (spam bursts, receiver spray, repeated payloads, high value, origin mismatch)
  - Time-series anomaly detection (online z-score for value + EWMA tx rate)
  - Optional **Gemini** batched analysis (every 1–10 minutes or 50–100 events)
- **Dashboard API (Fastify)** + live websocket feed
- **Next.js Dashboard** with Plotly visualizations and alert table

> Everything is written in modern ESM TypeScript (`"type": "module"`). No CommonJS.

---

## 1) Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres + Redis)

---

## 2) Quick start

### A. Start Postgres + Redis

```bash
cp .env.example .env
docker compose up -d
```

### B. Install deps

```bash
pnpm install
```

### C. Run DB migrations (creates tables)

```bash
pnpm db:migrate
```

### D. Start Hardhat node (local chain)

```bash
pnpm --filter @chainova/blockchain dev
```

Leave it running.

### E. Compile + deploy contract (copies ABI to collector)

In another terminal:

```bash
pnpm --filter @chainova/blockchain compile
pnpm --filter @chainova/blockchain run deploy
```

After deploy:
- `apps/collector/src/abi/EventEmitter.json` is created/updated
- root `.env` gets `EVENT_EMITTER_ADDRESS="0x..."` auto-updated (if `.env` exists)

### F. Start collector + worker + API + dashboard

Open 4 terminals (or run `pnpm dev`):

```bash
pnpm --filter @chainova/collector dev
pnpm --filter @chainova/analyzer-worker dev
pnpm --filter @chainova/api dev
pnpm --filter @chainova/dashboard dev
```

Dashboard: http://localhost:3000  
API: http://localhost:3001

### G. Generate test traffic + attacks

```bash
pnpm --filter @chainova/blockchain simulate
```

You should see events and alerts appear in the dashboard.

---

## 3) enable Gemini AI (batched)

Set:

```
GEMINI_API_KEY="YOUR_KEY"
GEMINI_MODEL="gemini-1.5-pro"
BATCH_MAX_EVENTS=100
BATCH_MAX_MS=600000
```

Behavior:
- Analyzer buffers events for up to `BATCH_MAX_MS` OR `BATCH_MAX_EVENTS` (whichever comes first),
- then calls Gemini once per batch and stores **one consolidated AI alert**.

If `GEMINI_API_KEY` is empty, AI analysis is disabled automatically.

---

## 4) Latency notes (how we avoid bottlenecks)

Collector:
- Uses WebSocket subscription (low latency)
- Does **minimal work** in the event handler
- Buffers for ~50ms and writes to Redis in a pipeline (reduces round trips)
- Has a hard memory cap to prevent crashes under burst load

Worker:
- Uses `BRPOP` (blocking pop) for low CPU and stable throughput
- Stores raw events immediately (so the dashboard can show logs quickly)
- Runs rule/anomaly detection per event, and batches only AI calls

---

## 5) Where to extend for a stronger security demo

### Add more rules
- rapid back-and-forth between same addresses (ping-pong)
- fan-in (many senders to one receiver) → mixer/collector pattern
- high gasPrice spikes (MEV / priority bidding)
- repeated origin across many senders (contract-controlled swarm)

### Improve time-series anomaly detection
- per-(sender,receiver) edges stats
- seasonality (daily/hourly) baselines
- robust statistics (median/MAD) for outliers
- change-point detection on tx/min

---

## Repo structure

- `apps/blockchain` — Hardhat contract + scripts
- `apps/collector` — WS subscription → Redis queue
- `apps/analyzer-worker` — Redis → Postgres + detection + (optional) Gemini
- `apps/api` — REST + websocket feed for dashboard
- `apps/dashboard` — Next.js UI + Plotly charts
- `packages/db` — Prisma schema + client
- `packages/shared` — shared TS types

Stay tuned,kitties!!!