import { Shield, Wifi, Server } from "lucide-react";

interface DashboardHeaderProps {
  apiUrl: string;
}

export function DashboardHeader({ apiUrl}: DashboardHeaderProps) {
  return (
    <header className="relative mb-8">
      {/* Background glow effect */}
      <div className="absolute -top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-border animate-pulse-glow">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neon-green border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient">
              CHAINOVA
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Blockchain Security Monitoring Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
            <Server className="w-4 h-4 text-primary" />
            <code className="text-xs text-muted-foreground">
              {apiUrl}
            </code>
          </div>
        </div>
      </div>
    </header>
  );
}
