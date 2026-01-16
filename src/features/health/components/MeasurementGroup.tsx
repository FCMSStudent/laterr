import { format, parseISO } from 'date-fns';
import type { HealthMeasurement } from '@/features/health/types';
import { extractNumericValue } from '@/features/health/utils/health-utils';
import { Scale, Heart, Droplet, Thermometer, Activity } from 'lucide-react';

interface MeasurementGroupProps {
  date: string;
  measurements: HealthMeasurement[];
  onMeasurementClick: (measurement: HealthMeasurement) => void;
}

/**
 * Date-grouped measurements component.
 * Shows measurements grouped by date with section headers.
 * Uses compact rows instead of full cards.
 */
export const MeasurementGroup = ({
  date,
  measurements,
  onMeasurementClick,
}: MeasurementGroupProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'weight':
        return <Scale className="w-4 h-4 text-primary" />;
      case 'blood_pressure':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'glucose':
        return <Droplet className="w-4 h-4 text-blue-500" />;
      case 'temperature':
        return <Thermometer className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getDisplayValue = (measurement: HealthMeasurement) => {
    if (measurement.measurement_type === 'blood_pressure' && 
        measurement.value && 
        'systolic' in measurement.value) {
      return `${measurement.value.systolic}/${measurement.value.diastolic} mmHg`;
    }
    const numValue = extractNumericValue(measurement.value);
    return numValue ? `${numValue} ${measurement.unit}` : '-';
  };

  const getLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get change indicator if available
  const getChange = (measurement: HealthMeasurement) => {
    // This would require previous measurement comparison - simplified for now
    return null;
  };

  return (
    <div className="mb-6">
      {/* Date header */}
      <h3 className="text-sm font-semibold text-foreground mb-2 px-4">
        {date}
      </h3>

      {/* Measurements list */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {measurements.map((measurement) => (
          <button
            key={measurement.id}
            onClick={() => onMeasurementClick(measurement)}
            className="w-full flex items-center justify-between py-3 px-4 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {getIcon(measurement.measurement_type)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-sm text-foreground">
                  {getLabel(measurement.measurement_type)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(measurement.measured_at), 'h:mm a')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-sm font-semibold text-foreground">
                {getDisplayValue(measurement)}
              </div>
              {getChange(measurement) && (
                <div className="text-xs text-green-600 dark:text-green-500">
                  {getChange(measurement)}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
