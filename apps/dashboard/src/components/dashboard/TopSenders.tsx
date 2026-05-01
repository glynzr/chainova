import { useMemo } from "react";
import { Users } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface Event {
  sender?: string;
  [key: string]: any;
}

interface TopSendersProps {
  events: Event[];
}

export function TopSenders({ events }: TopSendersProps) {
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

  const maxCount = topSenders[0]?.[1] ?? 1;

  return (
    <DashboardCard title="Top Senders" icon={<Users size={18} />}>
      <div className="space-y-3">
        {topSenders.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sender data yet.</p>
        ) : (
          topSenders.map(([addr, cnt], index) => (
            <div key={addr} className="group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-center justify-between mb-1">
                <code className="text-xs text-foreground/80 truncate max-w-[180px] group-hover:text-primary transition-colors">
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </code>
                <span className="font-mono font-semibold text-primary text-sm">
                  {cnt}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${(cnt / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardCard>
  );
}
