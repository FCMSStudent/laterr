import { useState } from 'react';
import { Scale, Heart, Droplet, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { HealthMeasurement } from '@/features/health/types';
import { extractNumericValue, calculateTrend } from '@/features/health/utils/health-utils';

interface InlineHealthStatsProps {
  measurements: HealthMeasurement[];
}

/**
 * Inline expandable health stats summary.
 * Collapsed: "⚖️ 72kg ↓ • ❤️ 120/80 • 🩸 95 mg/dL"
 * Expanded: Detailed stats with charts (placeholder for now)
 */
export const InlineHealthStats = ({ measurements }: InlineHealthStatsProps) => {
  const [expanded, setExpanded] = useState(false);

  // Extract latest measurements
  const latestWeight = measurements.find(m => m.measurement_type === 'weight');
  const latestBP = measurements.find(m => m.measurement_type === 'blood_pressure');
  const latestGlucose = measurements.find(m => m.measurement_type === 'glucose');

  const weightValue = latestWeight ? extractNumericValue(latestWeight.value) : null;
  const bpValue = latestBP?.value && 'systolic' in latestBP.value 
    ? { systolic: latestBP.value.systolic as number, diastolic: latestBP.value.diastolic as number } 
    : null;
  const glucoseValue = latestGlucose ? extractNumericValue(latestGlucose.value) : null;

  // Get trends
  const weightTrend = calculateTrend(measurements.filter(m => m.measurement_type === 'weight'));
  const bpTrend = calculateTrend(measurements.filter(m => m.measurement_type === 'blood_pressure'));
  const glucoseTrend = calculateTrend(measurements.filter(m => m.measurement_type === 'glucose'));

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-3 h-3 inline text-orange-500" aria-label="increasing" />;
      case 'decreasing':
        return <TrendingDown className="w-3 h-3 inline text-green-500" aria-label="decreasing" />;
      case 'stable':
        return <Minus className="w-3 h-3 inline text-muted-foreground" aria-label="stable" />;
      default:
        return null;
    }
  };

  // If no measurements, don't render
  if (!weightValue && !bpValue && !glucoseValue) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl p-3 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse health stats' : 'Expand health stats'}
      >
        <div className="flex-1 text-left">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {weightValue && (
              <span className="flex items-center gap-1">
                <Scale className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="font-semibold">{weightValue}kg</span>
                {getTrendIcon(weightTrend)}
              </span>
            )}
            {bpValue && (
              <>
                {weightValue && <span className="text-muted-foreground">•</span>}
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500" aria-hidden="true" />
                  <span className="font-semibold">{bpValue.systolic}/{bpValue.diastolic}</span>
                  {getTrendIcon(bpTrend)}
                </span>
              </>
            )}
            {glucoseValue && (
              <>
                {(weightValue || bpValue) && <span className="text-muted-foreground">•</span>}
                <span className="flex items-center gap-1">
                  <Droplet className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  <span className="font-semibold">{glucoseValue} mg/dL</span>
                  {getTrendIcon(glucoseTrend)}
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {weightValue && (
              <div className="glass-card rounded-xl p-3 flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Scale className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="text-base font-semibold flex items-center gap-1">
                    {weightValue} kg {getTrendIcon(weightTrend)}
                  </p>
                </div>
              </div>
            )}
            {bpValue && (
              <div className="glass-card rounded-xl p-3 flex items-center gap-2">
                <div className="p-2 rounded-full bg-red-500/10">
                  <Heart className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blood Pressure</p>
                  <p className="text-base font-semibold flex items-center gap-1">
                    {bpValue.systolic}/{bpValue.diastolic} {getTrendIcon(bpTrend)}
                  </p>
                </div>
              </div>
            )}
            {glucoseValue && (
              <div className="glass-card rounded-xl p-3 flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Droplet className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Glucose</p>
                  <p className="text-base font-semibold flex items-center gap-1">
                    {glucoseValue} mg/dL {getTrendIcon(glucoseTrend)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
