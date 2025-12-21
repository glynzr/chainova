import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { prisma } from "@chainova/db";
import pino from "pino";

function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

const log = pino({ level: process.env.CHAINOVA_LOG_LEVEL ?? "info" });
const app = Fastify({ logger: false });

await app.register(cors, { origin: true });
await app.register(websocket);

app.get("/health", async () => ({ ok: true }));

app.get("/api/events", async (req, reply) => {
  const limit = Number((req.query as any).limit ?? "200");
  const events = await prisma.rawEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 1000),
  });
  // return events;
  return events.map(serializeBigInt);

});

app.get("/api/alerts", async (req, reply) => {
  const limit = Number((req.query as any).limit ?? "200");
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 1000),
  });
  return alerts;
});

// Live alerts feed (websocket)
// app.get("/ws/alerts", { websocket: true }, (conn, req) => {
//   let timer: NodeJS.Timeout | null = null;
//   let last = new Date(0);

//   async function poll() {
//     const alerts = await prisma.alert.findMany({
//       where: { createdAt: { gt: last } },
//       orderBy: { createdAt: "asc" },
//       take: 200,
//     });
//     if (alerts.length) {
//       last = alerts[alerts.length - 1]!.createdAt;
//       conn.socket.send(JSON.stringify({ type: "alerts", alerts }));
//     }
//     timer = setTimeout(poll, 1000);
//   }

//   poll().catch((e) => log.error({ err: e }, "ws poll failed"));

//   conn.socket.on("close", () => {
//     if (timer) clearTimeout(timer);
//   });
// });
app.get("/ws/alerts", { websocket: true }, (conn, req) => {
  const socket = conn.socket;
  let timer: NodeJS.Timeout | null = null;
  let last = new Date(0);
  let closed = false;

  async function poll() {
    if (closed || !socket) return;

    try {
      const alerts = await prisma.alert.findMany({
        where: { createdAt: { gt: last } },
        orderBy: { createdAt: "asc" },
        take: 200,
      });

      if (
        alerts.length &&
        socket.readyState === socket.OPEN
      ) {
        last = alerts[alerts.length - 1]!.createdAt;
        socket.send(JSON.stringify({ type: "alerts", alerts }));
      }
    } catch (e) {
      if (!closed) {
        log.error({ err: e }, "ws poll failed");
      }
    }

    if (!closed) {
      timer = setTimeout(poll, 1000);
    }
  }

  poll();

  socket.on("close", () => {
    closed = true;
    if (timer) clearTimeout(timer);
  });
});

const PORT = Number(process.env.API_PORT ?? "3001");
app.listen({ port: PORT, host: "0.0.0.0" })
  .then(() => log.info({ PORT }, "api started"))
  .catch((e) => {
    log.error({ err: e }, "api failed to start");
    process.exit(1);
  });
