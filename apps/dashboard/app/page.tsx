"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
};

function badge(sev: string) {
  const map: Record<string, string> = {
    critical: "#ff3b3b",
    high: "#ff7b00",
    medium: "#f6c945",
    low: "#4ade80",
    info: "#60a5fa",
  };
  return map[sev] ?? "#94a3b8";
}

export default function Page() {
  const { data: rawEvents } = useSWR(
    `${API}/api/events?limit=500`,
    fetcher,
    { refreshInterval: 2000 }
  );

  const { data: rawAlerts } = useSWR(
    `${API}/api/alerts?limit=300`,
    fetcher,
    { refreshInterval: 2000 }
  );

  // ✅ ALWAYS arrays
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const alerts = Array.isArray(rawAlerts) ? rawAlerts : [];

  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`${API.replace("http", "ws")}/ws/alerts`);
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data?.type === "alerts" && Array.isArray(data.alerts)) {
          setLiveAlerts((prev) =>
            [...data.alerts, ...prev].slice(0, 300)
          );
        }
      } catch {}
    };
    return () => ws.close();
  }, []);


  // EVENT RATE CHART

  const chart = useMemo(() => {
    if (!events.length) return null;

    const byMinute = new Map<number, number>();

    for (const e of events) {
      if (!e?.timestamp) continue;
      const m = Math.floor(e.timestamp / 60) * 60;
      byMinute.set(m, (byMinute.get(m) ?? 0) + 1);
    }

    const xs = Array.from(byMinute.keys())
      .sort((a, b) => a - b)
      .map((t) => new Date(t * 1000));

    const ys = xs.map(
      (d) => byMinute.get(Math.floor(d.getTime() / 1000)) ?? 0
    );

    return { xs, ys };
  }, [events]);


  // 🔝 TOP SENDERS

  const topSenders = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      if (!e?.sender) continue;
      m.set(e.sender, (m.get(e.sender) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [events]);


  // MERGED ALERTS

  const allAlerts = useMemo(() => {
    const merged = [...liveAlerts, ...alerts];
    const seen = new Set<string>();
    const out: any[] = [];

    for (const a of merged) {
      if (a?.id && !seen.has(a.id)) {
        seen.add(a.id);
        out.push(a);
      }
    }
    return out.slice(0, 200);
  }, [liveAlerts, alerts]);

  // UI
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Event rate */}
      <section style={{ gridColumn: "1 / -1", background: "#0f1733", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 700 }}>Event rate (tx/min)</div>
        {chart ? (
          <Plot
            data={[{ x: chart.xs, y: chart.ys, type: "scatter", mode: "lines+markers" }]}
            layout={{
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              height: 300,
              font: { color: "#e6e8ef" },
            }}
            style={{ width: "100%" }}
            config={{ displayModeBar: false }}
          />
        ) : (
          <div style={{ opacity: 0.7 }}>Waiting for events…</div>
        )}
      </section>

      {/* Top senders */}
      <section style={{ background: "#0f1733", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 700 }}>Top senders</div>
        {topSenders.map(([addr, cnt]) => (
          <div key={addr} style={{ display: "flex", justifyContent: "space-between" }}>
            <code>{addr}</code>
            <b>{cnt}</b>
          </div>
        ))}
      </section>

      {/* Alerts */}
      <section style={{ background: "#0f1733", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 700 }}>Alerts</div>
        {allAlerts.length === 0 && <div>No alerts yet.</div>}
        {allAlerts.map((a) => (
          <div key={a.id} style={{ marginTop: 8 }}>
            <b>{a.title}</b>{" "}
            <span style={{ background: badge(a.severity), padding: "2px 6px", borderRadius: 8 }}>
              {a.severity}
            </span>
            <div>{a.reason}</div>
          </div>
        ))}
      </section>

      {/* Recent events */}
      <section style={{ gridColumn: "1 / -1", background: "#0f1733", borderRadius: 16, padding: 16 }}>
        <div style={{ fontWeight: 700 }}>Recent events</div>
        <table style={{ width: "100%", fontSize: 12 }}>
          <tbody>
            {events.slice(0, 40).map((e) => (
              <tr key={e.txHash}>
                <td>{new Date(e.timestamp * 1000).toLocaleTimeString()}</td>
                <td><code>{e.sender}</code></td>
                <td><code>{e.receiver}</code></td>
                <td>{e.value}</td>
                <td>{String(e.message).slice(0, 30)}</td>
                <td>{e.blockNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
