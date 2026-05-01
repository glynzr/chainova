import { useState } from "react";
import { AlertTriangle, Expand } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertDetailDialog } from "./AlertDetailsDialog";
import { AllAlertsDialog } from "./AllAlertsDialog";

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

interface AlertsFeedProps {
  alerts: Alert[];
}

const severityConfig: Record<string, { bg: string; text: string; glow: string }> = {
  critical: { 
    bg: "bg-neon-red/20", 
    text: "text-neon-red", 
    glow: "shadow-[0_0_10px_hsl(var(--neon-red)/0.5)]" 
  },
  high: { 
    bg: "bg-neon-orange/20", 
    text: "text-neon-orange", 
    glow: "shadow-[0_0_10px_hsl(var(--neon-orange)/0.5)]" 
  },
  medium: { 
    bg: "bg-neon-yellow/20", 
    text: "text-neon-yellow", 
    glow: "shadow-[0_0_10px_hsl(var(--neon-yellow)/0.5)]" 
  },
  low: { 
    bg: "bg-neon-green/20", 
    text: "text-neon-green", 
    glow: "shadow-[0_0_10px_hsl(var(--neon-green)/0.5)]" 
  },
  info: { 
    bg: "bg-neon-blue/20", 
    text: "text-neon-blue", 
    glow: "shadow-[0_0_10px_hsl(var(--neon-blue)/0.5)]" 
  },
};

export function AlertsFeed({ alerts }: AlertsFeedProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  return (
    <>
      <DashboardCard 
        title="Security Alerts" 
        icon={<AlertTriangle size={18} />}
        headerAction={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-primary hover:text-primary/80"
            onClick={() => setShowAllAlerts(true)}
          >
            <Expand size={14} className="mr-1" />
            View All
          </Button>
        }
      >
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-neon-green/10 flex items-center justify-center mb-3">
                <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
              </div>
              <p className="text-muted-foreground text-sm">All systems secure</p>
            </div>
          ) : (
            alerts.slice(0, 20).map((alert, index) => {
              const config = severityConfig[alert.severity] ?? severityConfig.info;
              return (
                <div 
                  key={alert.id} 
                  className={cn(
                    "p-3 rounded-lg border border-border/50 bg-muted/30",
                    "hover:bg-muted/50 transition-all duration-200 animate-slide-in cursor-pointer"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground/90 line-clamp-1">
                      {alert.title}
                    </span>
                    <span 
                      className={cn(
                        "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                        config.bg, config.text, config.glow
                      )}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  {alert.reason && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {alert.reason}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DashboardCard>

      <AlertDetailDialog
        alert={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      />

      <AllAlertsDialog
        alerts={alerts}
        open={showAllAlerts}
        onOpenChange={setShowAllAlerts}
      />
    </>
  );
}
