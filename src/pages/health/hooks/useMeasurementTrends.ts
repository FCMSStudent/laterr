/**
 * Custom hook for analyzing measurement trends
 * Provides statistical analysis and chart-ready data
 */

import { useMemo } from 'react';
import { useMeasurements } from './useMeasurements';
import type { ChartDataPoint, MeasurementType } from '../types';
import { format } from 'date-fns';

interface UseMeasurementTrendsOptions {
  measurementType: MeasurementType | string;
  daysBack?: number;
}

export const useMeasurementTrends = (options: UseMeasurementTrendsOptions) => {
  const { measurements, isLoading, error } = useMeasurements({
    measurementType: options.measurementType,
    daysBack: options.daysBack || 30,
  });

  // Process measurements into chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!measurements || measurements.length === 0) return [];

    return measurements
      .map((m) => {
        // Extract numeric value from different value structures
        let numericValue: number | null = null;
        
        if (typeof m.value === 'object') {
          if ('value' in m.value && typeof m.value.value === 'number') {
            numericValue = m.value.value;
          } else if ('systolic' in m.value && typeof m.value.systolic === 'number') {
            // For blood pressure, use systolic as primary value
            numericValue = m.value.systolic;
          }
        } else if (typeof m.value === 'number') {
          numericValue = m.value;
        }

        if (numericValue === null) return null;

        return {
          date: format(new Date(m.measured_at), 'MMM dd'),
          value: numericValue,
          label: m.unit || '',
        };
      })
      .filter((d): d is { date: string; value: number; label: string } => d !== null)
      .reverse(); // Reverse to show oldest to newest
  }, [measurements]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        trend: 'insufficient_data' as const,
        count: 0,
      };
    }

    const values = chartData.map((d) => d.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend by comparing first half vs second half
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
    if (values.length < 2) {
      trend = 'insufficient_data';
    } else if (secondAvg > firstAvg * 1.05) {
      trend = 'increasing';
    } else if (secondAvg < firstAvg * 0.95) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      average: Math.round(average * 10) / 10,
      min,
      max,
      trend,
      count: values.length,
    };
  }, [chartData]);

  return {
    chartData,
    statistics,
    measurements,
    isLoading,
    error,
  };
};
