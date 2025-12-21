"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const { data: events } = useSWR(`${API}/api/events?limit=500`, fetcher, { refreshInterval: 2000 });
  const { data: alerts } = useSWR(`${API}/api/alerts?limit=300`, fetcher, { refreshInterval: 2000 });

  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`${API.replace("http", "ws")}/ws/alerts`);
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === "alerts") {
          setLiveAlerts((prev) => [...data.alerts, ...prev].slice(0, 300));
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  const chart = useMemo(() => {
    if (!events) return null;
    const byMinute = new Map<number, number>();
    for (const e of events) {
      const m = Math.floor(e.timestamp / 60) * 60;
      byMinute.set(m, (byMinute.get(m) ?? 0) + 1);
    }
    const xs = Array.from(byMinute.keys()).sort((a, b) => a - b).map((t) => new Date(t * 1000));
    const ys = xs.map((d) => byMinute.get(Math.floor(d.getTime() / 1000)) ?? 0);
    return { xs, ys };
  }, [events]);

  const topSenders = useMemo(() => {
    if (!events) return [];
    const m = new Map<string, number>();
    for (const e of events) m.set(e.sender, (m.get(e.sender) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  const allAlerts = useMemo(() => {
    const a = [...(liveAlerts ?? []), ...(alerts ?? [])];
    // de-dup by id
    const seen = new Set<string>();
    const out: any[] = [];
    for (const x of a) {
      if (x?.id && !seen.has(x.id)) {
        seen.add(x.id);
        out.push(x);
      }
    }
    return out.slice(0, 200);
  }, [liveAlerts, alerts]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <section style={{ gridColumn: "1 / -1", background: "#0f1733", borderRadius: 16, padding: 16, border: "1px solid #1b2652" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>Event rate (tx/min)</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>auto-refresh</div>
        </div>
        {chart ? (
          <Plot
            data={[{ x: chart.xs, y: chart.ys, type: "scatter", mode: "lines+markers", name: "tx/min" }]}
            layout={{
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              autosize: true,
              height: 300,
              margin: { l: 40, r: 20, t: 30, b: 40 },
              font: { color: "#e6e8ef" },
              xaxis: { title: "time" },
              yaxis: { title: "tx/min" },
            }}
            style={{ width: "100%" }}
            config={{ displayModeBar: false }}
          />
        ) : (
          <div style={{ padding: 12, opacity: 0.7 }}>Waiting for events...</div>
        )}
      </section>

      <section style={{ background: "#0f1733", borderRadius: 16, padding: 16, border: "1px solid #1b2652" }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Top senders (last 500)</div>
        <div style={{ display: "grid", gap: 8 }}>
          {topSenders.map(([addr, cnt]) => (
            <div key={addr} style={{ display: "flex", justifyContent: "space-between", background: "#141a33", padding: "8px 10px", borderRadius: 12 }}>
              <code style={{ fontSize: 12 }}>{addr}</code>
              <div style={{ fontWeight: 700 }}>{cnt}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "#0f1733", borderRadius: 16, padding: 16, border: "1px solid #1b2652" }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Alerts (live)</div>
        <div style={{ display: "grid", gap: 10, maxHeight: 430, overflow: "auto" }}>
          {allAlerts.map((a) => (
            <div key={a.id} style={{ background: "#141a33", borderRadius: 14, padding: 12, border: "1px solid #1f2c61" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>{a.title}</div>
                <span style={{ background: badge(a.severity), color: "#0b1020", padding: "2px 8px", borderRadius: 999, fontWeight: 800, fontSize: 12 }}>
                  {a.severity}
                </span>
              </div>
              <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>{a.reason}</div>
              <div style={{ opacity: 0.75, marginTop: 8, fontSize: 12 }}>
                <b>Action:</b> {a.recommendedAction}
              </div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(a.indicators ?? []).slice(0, 6).map((i: any, idx: number) => (
                  <span key={idx} style={{ background: "#0b1020", border: "1px solid #24306a", padding: "2px 8px", borderRadius: 999, fontSize: 12, opacity: 0.9 }}>
                    {i.key}: {String(i.value)}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                {a.txHash ? <span>tx: <code>{a.txHash}</code></span> : null}
              </div>
            </div>
          ))}
          {!allAlerts.length ? <div style={{ opacity: 0.7 }}>No alerts yet.</div> : null}
        </div>
      </section>

      <section style={{ gridColumn: "1 / -1", background: "#0f1733", borderRadius: 16, padding: 16, border: "1px solid #1b2652" }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent events</div>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.8 }}>
                <th style={{ padding: 8 }}>time</th>
                <th style={{ padding: 8 }}>sender</th>
                <th style={{ padding: 8 }}>receiver</th>
                <th style={{ padding: 8 }}>value(wei)</th>
                <th style={{ padding: 8 }}>msg</th>
                <th style={{ padding: 8 }}>block</th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).slice(0, 40).map((e: any) => (
                <tr key={e.id} style={{ borderTop: "1px solid #1f2c61" }}>
                  <td style={{ padding: 8, opacity: 0.85 }}>{new Date(e.timestamp * 1000).toLocaleTimeString()}</td>
                  <td style={{ padding: 8 }}><code>{e.sender}</code></td>
                  <td style={{ padding: 8 }}><code>{e.receiver}</code></td>
                  <td style={{ padding: 8, opacity: 0.9 }}>{e.value}</td>
                  <td style={{ padding: 8, opacity: 0.85 }}>{String(e.message).slice(0, 40)}</td>
                  <td style={{ padding: 8, opacity: 0.85 }}>{e.blockNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
