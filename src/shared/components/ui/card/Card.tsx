import * as React from "react";
import { cn } from "@/shared/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn("rounded-2xl glass-medium text-card-foreground transition-all duration-300", className)} 
      {...props} 
    />
  )
);
Card.displayName = "Card";

export { Card };
