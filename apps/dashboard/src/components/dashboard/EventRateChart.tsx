import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface Event {
  timestamp: number;
}

function formatDay(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
  });
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventRateChart({ events }: { events: Event[] }) {
  const chartData = useMemo(() => {
    if (!events.length) return [];

    const byMinute = new Map<number, number>();
    for (const e of events) {
      const m = Math.floor(e.timestamp / 60) * 60;
      byMinute.set(m, (byMinute.get(m) ?? 0) + 1);
    }

    let lastDay = "";
    return Array.from(byMinute.keys())
      .sort((a, b) => a - b)
      .map((t) => {
        const day = formatDay(t);
        const isNewDay = day !== lastDay;
        lastDay = day;

        return {
          timestamp: t,
          label: isNewDay ? day : formatTime(t),
          isNewDay,
          count: byMinute.get(t) ?? 0,
        };
      });
  }, [events]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-card/95 backdrop-blur-md border border-primary/40 rounded-xl px-4 py-3 shadow-xl">
        <div className="text-sm font-semibold text-primary">{d.label}</div>
        {!d.isNewDay && (
          <div className="text-xs text-muted-foreground mb-1">
            {new Date(d.timestamp * 1000).toDateString()}
          </div>
        )}
        <div className="text-lg font-bold">
          {d.count} <span className="text-xs text-muted-foreground">tx / min</span>
        </div>
      </div>
    );
  };

  return (
    <DashboardCard title="Event Rate (tx/min)" icon={<Activity size={18} />} fullWidth>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(187 100% 55%)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="hsl(270 100% 65%)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(222 30% 16%)"
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              tickFormatter={(t) => {
                const item = chartData.find((x) => x.timestamp === t);
                return item?.label ?? "";
              }}
              tick={({ x, y, payload }) => {
                const item = chartData.find((i) => i.timestamp === payload.value);
                if (!item) return null;

                return (
                  <text
                    x={x}
                    y={y + 14}
                    textAnchor="middle"
                    fontSize={item.isNewDay ? 12 : 10}
                    fontWeight={item.isNewDay ? 700 : 400}
                    fill={item.isNewDay ? "hsl(187 100% 55%)" : "hsl(215 20% 55%)"}
                  >
                    {item.label}
                  </text>
                );
              }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="hsl(215 20% 55%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip content={<CustomTooltip />} />

            {chartData
              .filter((d) => d.isNewDay)
              .map((d) => (
                <ReferenceLine
                  key={d.timestamp}
                  x={d.timestamp}
                  stroke="hsl(187 100% 55%)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
              ))}

            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(187 100% 55%)"
              strokeWidth={3}
              fill="url(#areaGlow)"
              dot={false}
              activeDot={{
                r: 6,
                fill: "hsl(187 100% 55%)",
                stroke: "white",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
}
