import { cn } from "@/shared/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface ChecklistProgressProps {
  completed: number;
  total: number;
  variant?: 'bar' | 'badge' | 'inline';
  className?: string;
}

export const ChecklistProgress = ({
  completed,
  total,
  variant = 'bar',
  className,
}: ChecklistProgressProps) => {
  if (total === 0) return null;

  const percentage = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  if (variant === 'badge') {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
        isComplete 
          ? "bg-primary/20 text-primary" 
          : "bg-muted text-muted-foreground",
        className
      )}>
        <CheckCircle2 className="h-3 w-3" />
        <span>{completed}/{total}</span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn(
        "text-xs font-medium",
        isComplete ? "text-primary" : "text-muted-foreground",
        className
      )}>
        ✓ {completed}/{total}
      </span>
    );
  }

  // Default: bar variant
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          "font-medium",
          isComplete ? "text-primary" : "text-muted-foreground"
        )}>
          {isComplete ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              All done!
            </span>
          ) : (
            `${completed} of ${total} complete`
          )}
        </span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isComplete ? "bg-primary" : "bg-primary/60"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
