import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { AlertDetailDialog } from "./AlertDetailsDialog";

interface Alert {
  id: string;
  title: string;
  severity: string;
  category?: string;
  ruleId?: string;
  reason?: string;
  recommendedAction?: string;
  sender?: string;
  receiver?: string;
  txHash?: string;
  indicator?: string;
  timestamp?: number;
}

interface AllAlertsDialogProps {
  alerts: Alert[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityConfig: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-neon-red/20", text: "text-neon-red" },
  high: { bg: "bg-neon-orange/20", text: "text-neon-orange" },
  medium: { bg: "bg-neon-yellow/20", text: "text-neon-yellow" },
  low: { bg: "bg-neon-green/20", text: "text-neon-green" },
  info: { bg: "bg-neon-blue/20", text: "text-neon-blue" },
};

export function AllAlertsDialog({ alerts, open, onOpenChange }: AllAlertsDialogProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [sortField, setSortField] = useState<"timestamp" | "severity">("timestamp");
  const [sortAsc, setSortAsc] = useState(false);

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

  const sortedAlerts = [...alerts].sort((a, b) => {
    if (sortField === "timestamp") {
      const diff = (b.timestamp ?? 0) - (a.timestamp ?? 0);
      return sortAsc ? -diff : diff;
    }
    const diff = (severityOrder[a.severity as keyof typeof severityOrder] ?? 5) - 
                 (severityOrder[b.severity as keyof typeof severityOrder] ?? 5);
    return sortAsc ? -diff : diff;
  });

  const SortButton = ({ field, label }: { field: "timestamp" | "severity"; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={() => {
        if (sortField === field) {
          setSortAsc(!sortAsc);
        } else {
          setSortField(field);
          setSortAsc(false);
        }
      }}
    >
      {label}
      {sortField === field && (
        sortAsc ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />
      )}
    </Button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-card border-border/50 max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-primary" />
                <DialogTitle className="font-display">All Alerts ({alerts.length})</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort by:</span>
                <SortButton field="timestamp" label="Time" />
                <SortButton field="severity" label="Severity" />
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Severity</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Title</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Category</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Rule ID</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Sender</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {sortedAlerts.map((alert) => {
                  const config = severityConfig[alert.severity] ?? severityConfig.info;
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-border/20 hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <td className="py-2 px-2">
                        <Badge className={cn("text-[10px]", config.bg, config.text)}>
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-foreground/90 line-clamp-1">{alert.title}</span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-muted-foreground text-xs">{alert.category ?? "—"}</span>
                      </td>
                      <td className="py-2 px-2">
                        <code className="text-xs text-primary/70">{alert.ruleId ?? "—"}</code>
                      </td>
                      <td className="py-2 px-2">
                        <code className="text-xs text-muted-foreground">
                          {alert.sender ? `${alert.sender.slice(0, 6)}...${alert.sender.slice(-4)}` : "—"}
                        </code>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {alert.timestamp ? new Date(alert.timestamp * 1000).toLocaleTimeString() : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {alerts.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">No alerts</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDetailDialog
        alert={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      />
    </>
  );
}
