import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export const SaveStatusIndicator = ({ status, className }: SaveStatusIndicatorProps) => {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm premium-transition",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-4 w-4 text-green-500 animate-in zoom-in-50 duration-300" />
          <span className="text-green-600 dark:text-green-500">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Failed to save</span>
        </>
      )}
    </div>
  );
};
