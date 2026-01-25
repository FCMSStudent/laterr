import { Badge } from "@/ui";
import { Button } from "@/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui";
import { 
  MoreVertical, Trash2, TrendingUp, TrendingDown, Minus,
  Scale, Heart, Droplet, Activity, Moon, Footprints, Flame, Thermometer, Wind, Percent
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { HealthMeasurement, MeasurementType } from "@/features/health/types";
import { formatHealthValue } from "@/features/health/utils/health-utils";
import { MEASUREMENT_TYPES } from "@/features/health/constants";

interface MeasurementCardProps {
  measurement: HealthMeasurement;
  trend: 'increasing' | 'decreasing' | 'stable';
  onClick: () => void;
  onDelete?: (id: string) => void;
}

const MEASUREMENT_ICONS: Record<MeasurementType, React.ReactNode> = {
  weight: <Scale className="h-5 w-5" />,
  blood_pressure: <Heart className="h-5 w-5" />,
  glucose: <Droplet className="h-5 w-5" />,
  heart_rate: <Activity className="h-5 w-5" />,
  body_fat: <Percent className="h-5 w-5" />,
  sleep_hours: <Moon className="h-5 w-5" />,
  steps: <Footprints className="h-5 w-5" />,
  calories: <Flame className="h-5 w-5" />,
  temperature: <Thermometer className="h-5 w-5" />,
  oxygen_saturation: <Wind className="h-5 w-5" />,
};

const MEASUREMENT_COLORS: Record<MeasurementType, string> = {
  weight: 'border-l-primary',
  blood_pressure: 'border-l-red-500',
  glucose: 'border-l-blue-500',
  heart_rate: 'border-l-pink-500',
  body_fat: 'border-l-yellow-500',
  sleep_hours: 'border-l-indigo-500',
  steps: 'border-l-green-500',
  calories: 'border-l-orange-500',
  temperature: 'border-l-cyan-500',
  oxygen_saturation: 'border-l-purple-500',
};

export const MeasurementCard = ({
  measurement,
  trend,
  onClick,
  onDelete,
}: MeasurementCardProps) => {
  const measurementType = measurement.measurement_type as MeasurementType;
  const typeInfo = MEASUREMENT_TYPES[measurementType];
  const icon = MEASUREMENT_ICONS[measurementType] || <Activity className="h-5 w-5" />;
  const borderColor = MEASUREMENT_COLORS[measurementType] || 'border-l-muted';

  const formattedValue = formatHealthValue(
    measurement.value,
    measurementType,
    measurement.unit || typeInfo?.unit
  );

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={`glass-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative border-l-4 ${borderColor}`}
    >
      {/* Actions menu */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 premium-transition">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-background/80 hover:bg-background">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => handleMenuAction(e, () => onDelete(measurement.id))}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        {/* Header with icon and type */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {typeInfo?.label || measurementType}
          </span>
          {getTrendIcon()}
        </div>

        {/* Value */}
        <div className="text-3xl font-bold text-foreground">
          {formattedValue}
        </div>

        {/* Date/Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{format(new Date(measurement.measured_at), 'MMM d, yyyy')}</span>
          <span>•</span>
          <span>{format(new Date(measurement.measured_at), 'h:mm a')}</span>
        </div>

        {/* Notes preview */}
        {measurement.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {measurement.notes}
          </p>
        )}

        {/* Tags */}
        {measurement.tags && measurement.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {measurement.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {measurement.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{measurement.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
