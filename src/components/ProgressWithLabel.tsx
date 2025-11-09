import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressWithLabelProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressWithLabel = ({
  value,
  label,
  showPercentage = true,
  className,
}: ProgressWithLabelProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium text-foreground">{Math.round(value)}%</span>
          )}
        </div>
      )}
      <Progress value={value} />
    </div>
  );
};
