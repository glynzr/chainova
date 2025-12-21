import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function DashboardCard({ title, icon, children, className, fullWidth }: DashboardCardProps) {
  return (
    <section
      className={cn(
        "relative rounded-xl border border-border/50 bg-card p-5 card-glow overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-b before:from-primary/5 before:to-transparent before:pointer-events-none",
        fullWidth && "col-span-full",
        className
      )}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary/50 rounded-tl-xl" />
      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary/50 rounded-tr-xl" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary/50 rounded-bl-xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary/50 rounded-br-xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          {icon && (
            <div className="text-primary animate-pulse-glow p-1">
              {icon}
            </div>
          )}
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}
