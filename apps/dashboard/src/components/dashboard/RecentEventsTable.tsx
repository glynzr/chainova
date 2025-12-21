import { List } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

interface Event {
  txHash: string;
  timestamp: number;
  sender: string;
  receiver: string;
  value: string | number;
  message?: string;
  blockNumber: number;
}

interface RecentEventsTableProps {
  events: Event[];
}

export function RecentEventsTable({ events }: RecentEventsTableProps) {
  return (
    <DashboardCard title="Recent Transactions" icon={<List size={18} />} fullWidth>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Time</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Sender</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Receiver</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Value</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Message</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Block</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 25).map((e, index) => (
              <tr 
                key={e.txHash} 
                className="border-b border-border/20 hover:bg-primary/5 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <td className="py-2.5 px-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(e.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <code className="text-xs text-primary/80 hover:text-primary cursor-pointer transition-colors">
                    {e.sender?.slice(0, 8)}...{e.sender?.slice(-4)}
                  </code>
                </td>
                <td className="py-2.5 px-2">
                  <code className="text-xs text-secondary hover:text-secondary/80 cursor-pointer transition-colors">
                    {e.receiver?.slice(0, 8)}...{e.receiver?.slice(-4)}
                  </code>
                </td>
                <td className="py-2.5 px-2 text-right">
                  <span className="font-mono text-xs font-medium text-foreground">
                    {e.value}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                    {String(e.message ?? '').slice(0, 30) || '—'}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right">
                  <span className="font-mono text-xs text-neon-green">
                    #{e.blockNumber}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No transactions yet
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
