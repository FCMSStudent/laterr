import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/ui";
import { Button } from "@/ui";
import { Badge } from "@/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui";
import { Trash2, Plus, TrendingUp, TrendingDown, Minus, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import type { HealthMeasurement, MeasurementType } from "@/features/health/types";
import { formatHealthValue, extractNumericValue, calculateAverageValue } from "@/features/health/utils/health-utils";
import { MEASUREMENT_TYPES } from "@/features/health/constants";
import { HealthChartPanel } from "@/features/health/components/HealthChartPanel";

interface MeasurementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: HealthMeasurement;
  allMeasurements: HealthMeasurement[];
  onUpdate: () => void;
  onDelete: (id: string) => void;
}

export const MeasurementDetailModal = ({
  open,
  onOpenChange,
  measurement,
  allMeasurements,
  onUpdate,
  onDelete,
}: MeasurementDetailModalProps) => {
  const measurementType = measurement.measurement_type as MeasurementType;
  const typeInfo = MEASUREMENT_TYPES[measurementType];

  const formattedValue = formatHealthValue(
    measurement.value,
    measurementType,
    measurement.unit || typeInfo?.unit
  );

  // Calculate stats
  const values = allMeasurements.map(m => extractNumericValue(m.value));
  const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  // Calculate trend
  const getTrend = () => {
    if (allMeasurements.length < 2) return 'stable';
    const sorted = [...allMeasurements].sort(
      (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    );
    const latest = extractNumericValue(sorted[sorted.length - 1].value);
    const previous = extractNumericValue(sorted[sorted.length - 2].value);
    if (latest > previous * 1.01) return 'increasing';
    if (latest < previous * 0.99) return 'decreasing';
    return 'stable';
  };

  const trend = getTrend();

  const handleDelete = () => {
    onDelete(measurement.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl !bg-background border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground flex items-center gap-3">
            {typeInfo?.label || measurementType}
            <Badge variant="secondary" className="text-sm font-normal">
              {trend === 'increasing' && <TrendingUp className="w-3 h-3 mr-1" />}
              {trend === 'decreasing' && <TrendingDown className="w-3 h-3 mr-1" />}
              {trend === 'stable' && <Minus className="w-3 h-3 mr-1" />}
              {trend}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View measurement details and history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Value */}
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Current Reading</p>
            <p className="text-4xl font-bold text-foreground">{formattedValue}</p>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(measurement.measured_at), 'MMM d, yyyy')}</span>
              <Clock className="w-4 h-4 ml-2" />
              <span>{format(new Date(measurement.measured_at), 'h:mm a')}</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chart">History Chart</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="mt-4">
              <HealthChartPanel
                measurementType={measurementType}
                data={allMeasurements}
                dateRange="30d"
              />
            </TabsContent>

            <TabsContent value="stats" className="mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Average</p>
                  <p className="text-xl font-semibold">{average.toFixed(1)}</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Min</p>
                  <p className="text-xl font-semibold">{min.toFixed(1)}</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Max</p>
                  <p className="text-xl font-semibold">{max.toFixed(1)}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Based on {allMeasurements.length} measurements
              </p>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          {measurement.notes && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Notes</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {measurement.notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {measurement.tags && measurement.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {measurement.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">#{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
