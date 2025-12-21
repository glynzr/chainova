import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface Event {
  timestamp: number;
  [key: string]: any;
}

interface EventRateChartProps {
  events: Event[];
}

export function EventRateChart({ events }: EventRateChartProps) {
  const chartData = useMemo(() => {
    if (!events.length) return [];

    const byMinute = new Map<number, number>();

    for (const e of events) {
      if (!e?.timestamp) continue;
      const m = Math.floor(e.timestamp / 60) * 60;
      byMinute.set(m, (byMinute.get(m) ?? 0) + 1);
    }

    return Array.from(byMinute.keys())
      .sort((a, b) => a - b)
      .map((t) => ({
        time: new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        count: byMinute.get(t) ?? 0,
        timestamp: t,
      }));
  }, [events]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-primary/30 rounded-lg px-4 py-2 shadow-lg">
          <p className="font-mono text-primary text-sm">{label}</p>
          <p className="text-foreground font-semibold">
            {payload[0].value} <span className="text-muted-foreground text-xs">tx/min</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardCard 
      title="Event Rate (tx/min)" 
      icon={<Activity size={18} />}
      fullWidth
    >
      {chartData.length > 0 ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(187 100% 50%)" stopOpacity={0.5} />
                  <stop offset="50%" stopColor="hsl(270 100% 65%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(270 100% 65%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(187 100% 50%)" />
                  <stop offset="100%" stopColor="hsl(270 100% 65%)" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(222 30% 18%)" 
                vertical={false}
              />
              <XAxis 
                dataKey="time" 
                stroke="hsl(215 20% 55%)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'hsl(222 30% 18%)' }}
              />
              <YAxis 
                stroke="hsl(215 20% 55%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="url(#strokeGradient)"
                strokeWidth={3}
                fill="url(#colorCount)"
                filter="url(#glow)"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "hsl(187 100% 50%)",
                  stroke: "hsl(187 100% 70%)",
                  strokeWidth: 2,
                  filter: "url(#glow)"
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Waiting for events…</p>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
