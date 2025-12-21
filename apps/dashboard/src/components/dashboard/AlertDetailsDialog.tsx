import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, Hash, User, ArrowRight, FileText, Shield, Lightbulb } from "lucide-react";

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

interface AlertDetailDialogProps {
  alert: Alert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-neon-red/20", text: "text-neon-red", border: "border-neon-red/50" },
  high: { bg: "bg-neon-orange/20", text: "text-neon-orange", border: "border-neon-orange/50" },
  medium: { bg: "bg-neon-yellow/20", text: "text-neon-yellow", border: "border-neon-yellow/50" },
  low: { bg: "bg-neon-green/20", text: "text-neon-green", border: "border-neon-green/50" },
  info: { bg: "bg-neon-blue/20", text: "text-neon-blue", border: "border-neon-blue/50" },
};

export function AlertDetailDialog({ alert, open, onOpenChange }: AlertDetailDialogProps) {
  if (!alert) return null;

  const config = severityConfig[alert.severity] ?? severityConfig.info;

  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2 border-b border-border/30">
        <Icon size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          <p className="text-sm text-foreground font-mono break-all">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border/50 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <AlertTriangle size={20} className={config.text} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-display">{alert.title}</DialogTitle>
              <Badge className={cn("mt-1", config.bg, config.text, "border", config.border)}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-1 mt-4">
          <DetailRow icon={Hash} label="Alert ID" value={alert.id} />
          <DetailRow icon={Shield} label="Category" value={alert.category} />
          <DetailRow icon={FileText} label="Rule ID" value={alert.ruleId} />
          <DetailRow icon={FileText} label="Reason" value={alert.reason} />
          <DetailRow icon={Lightbulb} label="Recommended Action" value={alert.recommendedAction} />
          <DetailRow icon={User} label="Sender" value={alert.sender} />
          <DetailRow icon={ArrowRight} label="Receiver" value={alert.receiver} />
          <DetailRow icon={Hash} label="Transaction Hash" value={alert.txHash} />
          <DetailRow icon={AlertTriangle} label="Indicator" value={alert.indicator} />
          {alert.timestamp && (
            <DetailRow 
              icon={Clock} 
              label="Timestamp" 
              value={new Date(alert.timestamp * 1000).toLocaleString()} 
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
