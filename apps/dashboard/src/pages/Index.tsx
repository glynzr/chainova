import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EventRateChart } from "@/components/dashboard/EventRateChart";
import { TopSenders } from "@/components/dashboard/TopSenders";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { RecentEventsTable } from "@/components/dashboard/RecentEventsTable";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
};

export default function Index() {
  // Fetch events
  const { data: rawEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => fetcher(`${API}/api/events?limit=500`),
    refetchInterval: 2000,
  });

  // Fetch alerts
  const { data: rawAlerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetcher(`${API}/api/alerts?limit=300`),
    refetchInterval: 2000,
  });

  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const alerts = Array.isArray(rawAlerts) ? rawAlerts : [];

  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket for live alerts
  useEffect(() => {
    const wsUrl = `${API.replace("http", "ws")}/ws/alerts`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data?.type === "alerts" && Array.isArray(data.alerts)) {
          setLiveAlerts((prev) => [...data.alerts, ...prev].slice(0, 300));
        }
      } catch {}
    };

    return () => ws.close();
  }, []);

  // Merge live and fetched alerts
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

  return (
    <div className="min-h-screen bg-background grid-pattern relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <DashboardHeader apiUrl={API} isConnected={isConnected} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <EventRateChart events={events} />
          <TopSenders events={events} />
          <AlertsFeed alerts={allAlerts} />
          <RecentEventsTable events={events} />
        </div>

        <footer className="mt-10 pt-6 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            Demo project — Rule-based + Time-series anomaly detection + Optional Gemini batch analysis
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary/70 font-mono">Chainova Security v1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
