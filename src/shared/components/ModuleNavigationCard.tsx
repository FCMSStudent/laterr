import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ArrowRight } from "lucide-react";

interface ModuleNavigationCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const ModuleNavigationCard = ({
  icon: Icon,
  title,
  description,
  count,
  onClick,
  className,
  disabled = false,
}: ModuleNavigationCardProps) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all group",
        disabled 
          ? "cursor-not-allowed" 
          : "cursor-pointer hover:shadow-xl hover:scale-[1.02]",
        className
      )}
      onClick={handleClick}
      role={disabled ? "presentation" : "button"}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          {count !== undefined && (
            <Badge variant="secondary" className="text-sm">
              {count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
          Open module
          <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
};
