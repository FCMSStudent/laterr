/**
 * MeasurementCard - Display individual measurement with actions
 */

import { Activity, Droplet, Heart, Scale, Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { format } from 'date-fns';
import type { HealthMeasurement } from '../types';
import { cn } from '@/shared/lib/utils';

interface MeasurementCardProps {
  measurement: HealthMeasurement;
  onEdit?: () => void;
  onDelete?: () => void;
  showTrend?: 'up' | 'down' | 'stable';
}

const MEASUREMENT_ICONS: Record<string, any> = {
  weight: Scale,
  blood_pressure: Activity,
  heart_rate: Heart,
  blood_glucose: Droplet,
  steps: Activity,
  sleep_hours: Moon,
  water_intake: Droplet,
};

export const MeasurementCard = ({ measurement, onEdit, onDelete, showTrend }: MeasurementCardProps) => {
  const Icon = MEASUREMENT_ICONS[measurement.measurement_type] || Activity;
  
  // Format the display value - always returns a string or number for rendering
  const getDisplayValue = (): string | number => {
    if (typeof measurement.value === 'object' && measurement.value !== null) {
      if ('systolic' in measurement.value && 'diastolic' in measurement.value) {
        return `${measurement.value.systolic}/${measurement.value.diastolic}`;
      }
      if ('value' in measurement.value && measurement.value.value !== undefined) {
        return measurement.value.value;
      }
      // For any other object structure, convert to string
      return JSON.stringify(measurement.value);
    }
    // For primitive values
    if (typeof measurement.value === 'string' || typeof measurement.value === 'number') {
      return measurement.value;
    }
    return String(measurement.value);
  };

  const displayValue = getDisplayValue();
  const displayUnit = measurement.unit || '';

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold capitalize">
                  {measurement.measurement_type.replace('_', ' ')}
                </h3>
                {showTrend && (
                  <span className={cn(
                    "text-xs",
                    showTrend === 'up' && "text-green-600",
                    showTrend === 'down' && "text-red-600",
                    showTrend === 'stable' && "text-gray-600"
                  )}>
                    {showTrend === 'up' && <TrendingUp className="w-4 h-4 inline" />}
                    {showTrend === 'down' && <TrendingDown className="w-4 h-4 inline" />}
                    {showTrend === 'stable' && <Minus className="w-4 h-4 inline" />}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold text-primary">{displayValue}</span>
                {displayUnit && <span className="text-sm text-muted-foreground ml-1">{displayUnit}</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(measurement.measured_at), 'MMM dd, yyyy h:mm a')}
              </p>
              {measurement.notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">{measurement.notes}</p>
              )}
            </div>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
