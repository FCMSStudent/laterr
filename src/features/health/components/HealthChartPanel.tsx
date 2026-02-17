import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Button } from "@/shared/components/ui";
import { format, subDays, subMonths, subYears, isAfter } from "date-fns";
import type { HealthMeasurement, MeasurementType } from "@/features/health/types";
import { extractNumericValue } from "@/features/health/utils/health-utils";
import { NORMAL_RANGES, MEASUREMENT_TYPES } from "@/features/health/constants";

type DateRange = '7d' | '30d' | '90d' | '1y';

interface HealthChartPanelProps {
  measurementType: MeasurementType;
  data: HealthMeasurement[];
  dateRange?: DateRange;
}

export const HealthChartPanel = ({
  measurementType,
  data,
  dateRange: initialRange = '30d',
}: HealthChartPanelProps) => {
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  // Filter data by date range
  const startDate = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subMonths(now, 3);
      case '1y': return subYears(now, 1);
      default: return subDays(now, 30);
    }
  }, [dateRange]);

  const filteredData = useMemo(() => data
    .filter(m => isAfter(new Date(m.measured_at), startDate))
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()),
  [data, startDate]);

  // Transform data for chart
  const chartData = useMemo(() => filteredData.map(m => ({
    date: format(new Date(m.measured_at), 'MMM d'),
    fullDate: m.measured_at,
    value: extractNumericValue(m.value),
    // For blood pressure, also include systolic and diastolic
    ...(measurementType === 'blood_pressure' && 'systolic' in m.value ? {
      systolic: m.value.systolic as number,
      diastolic: m.value.diastolic as number,
    } : {}),
  })), [filteredData, measurementType]);

  // Get normal ranges for reference lines
  const normalRange = NORMAL_RANGES[measurementType as keyof typeof NORMAL_RANGES];
  const typeInfo = MEASUREMENT_TYPES[measurementType];

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available for this time period
      </div>
    );
  }

  const isBloodPressure = measurementType === 'blood_pressure';

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className="flex gap-2 justify-center">
        {(['7d', '30d', '90d', '1y'] as DateRange[]).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(range)}
          >
            {range === '7d' && '7 Days'}
            {range === '30d' && '30 Days'}
            {range === '90d' && '3 Months'}
            {range === '1y' && '1 Year'}
          </Button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [
                `${value} ${typeInfo?.unit || ''}`,
                name === 'value' ? typeInfo?.label : name,
              ]}
            />
            
            {/* Reference lines for normal range */}
            {normalRange && 'min' in normalRange && (
              <>
                <ReferenceLine 
                  y={(normalRange as { min: number; max: number }).min} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5" 
                  label={{ value: 'Min', position: 'insideTopLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <ReferenceLine 
                  y={(normalRange as { min: number; max: number }).max} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  label={{ value: 'Max', position: 'insideTopLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
              </>
            )}

            {/* Lines */}
            {isBloodPressure ? (
              <>
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name="Systolic"
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name="Diastolic"
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for blood pressure */}
      {isBloodPressure && (
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Systolic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Diastolic</span>
          </div>
        </div>
      )}
    </div>
  );
};
