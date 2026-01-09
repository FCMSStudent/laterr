import { UNIT_CONVERSIONS, BMI_CATEGORIES, NORMAL_RANGES, MEASUREMENT_TYPES } from '@/constants/health';
import type { MeasurementType, HealthMeasurement, BloodPressureValue, NumericValue } from '@/types/health';

/**
 * Convert health units between different measurement systems
 */
export function convertHealthUnits(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const conversionKey = `${fromUnit.toLowerCase()}_to_${toUnit.toLowerCase()}`;
  
  // Weight conversions
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return value * UNIT_CONVERSIONS.weight.kg_to_lbs;
  }
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return value * UNIT_CONVERSIONS.weight.lbs_to_kg;
  }
  
  // Height conversions
  if (fromUnit === 'cm' && toUnit === 'inches') {
    return value * UNIT_CONVERSIONS.height.cm_to_inches;
  }
  if (fromUnit === 'inches' && toUnit === 'cm') {
    return value * UNIT_CONVERSIONS.height.inches_to_cm;
  }
  if (fromUnit === 'cm' && toUnit === 'feet') {
    return value * UNIT_CONVERSIONS.height.cm_to_feet;
  }
  if (fromUnit === 'feet' && toUnit === 'cm') {
    return value * UNIT_CONVERSIONS.height.feet_to_cm;
  }
  
  // Temperature conversions
  if (fromUnit === 'C' && toUnit === 'F') {
    return UNIT_CONVERSIONS.temperature.c_to_f(value);
  }
  if (fromUnit === 'F' && toUnit === 'C') {
    return UNIT_CONVERSIONS.temperature.f_to_c(value);
  }
  
  // Glucose conversions
  if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
    return value * UNIT_CONVERSIONS.glucose.mgdl_to_mmol;
  }
  if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
    return value * UNIT_CONVERSIONS.glucose.mmol_to_mgdl;
  }
  
  // Return original if no conversion found
  return value;
}

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Get BMI category label and color
 */
export function getBMICategory(bmi: number): { label: string; color: string } {
  const category = BMI_CATEGORIES.find(c => bmi >= c.min && bmi < c.max);
  return category || { label: 'Unknown', color: '#9E9E9E' };
}

/**
 * Calculate trend from a series of measurements
 */
export function calculateTrend(
  measurements: HealthMeasurement[]
): 'increasing' | 'decreasing' | 'stable' {
  if (measurements.length < 2) return 'stable';
  
  // Sort by date (oldest first)
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );
  
  // Get numeric values
  const values = sorted.map(m => extractNumericValue(m.value));
  
  // Calculate simple linear regression slope
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  // Determine trend based on slope (with threshold)
  const threshold = yMean * 0.01; // 1% of mean as threshold
  
  if (slope > threshold) return 'increasing';
  if (slope < -threshold) return 'decreasing';
  return 'stable';
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Extract numeric value from measurement value object
 */
export function extractNumericValue(value: Record<string, unknown>): number {
  // Handle blood pressure (average of systolic and diastolic)
  if ('systolic' in value && 'diastolic' in value) {
    const systolic = value.systolic as number;
    const diastolic = value.diastolic as number;
    return (systolic + diastolic) / 2;
  }
  
  // Handle simple numeric value
  if ('value' in value) {
    return value.value as number;
  }
  
  // Try to find any numeric property
  for (const key of Object.keys(value)) {
    if (typeof value[key] === 'number') {
      return value[key] as number;
    }
  }
  
  return 0;
}

/**
 * Format health value for display
 */
export function formatHealthValue(
  value: Record<string, unknown> | number,
  type: MeasurementType,
  unit?: string
): string {
  const displayUnit = unit || MEASUREMENT_TYPES[type]?.unit || '';
  
  // Handle blood pressure specially
  if (type === 'blood_pressure' && typeof value === 'object' && 'systolic' in value && 'diastolic' in value) {
    const systolic = value.systolic as number;
    const diastolic = value.diastolic as number;
    return `${systolic}/${diastolic} ${displayUnit}`;
  }
  
  // Handle numeric value object
  if (typeof value === 'object' && 'value' in value) {
    const numValue = value.value as number;
    return `${formatNumber(numValue)} ${displayUnit}`;
  }
  
  // Handle raw number
  if (typeof value === 'number') {
    return `${formatNumber(value)} ${displayUnit}`;
  }
  
  return String(value);
}

/**
 * Format number with appropriate decimal places
 */
export function formatNumber(value: number, decimals: number = 1): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(decimals);
}

/**
 * Check if a measurement is within normal range
 */
export function isWithinNormalRange(
  type: MeasurementType,
  value: Record<string, unknown>
): { isNormal: boolean; message?: string } {
  const range = NORMAL_RANGES[type as keyof typeof NORMAL_RANGES];
  if (!range) return { isNormal: true };
  
  // Handle blood pressure
  if (type === 'blood_pressure' && 'systolic' in value && 'diastolic' in value) {
    const systolic = value.systolic as number;
    const diastolic = value.diastolic as number;
    const bpRange = range as typeof NORMAL_RANGES.blood_pressure;
    
    const systolicNormal = systolic >= bpRange.systolic.min && systolic <= bpRange.systolic.max;
    const diastolicNormal = diastolic >= bpRange.diastolic.min && diastolic <= bpRange.diastolic.max;
    
    if (!systolicNormal || !diastolicNormal) {
      return {
        isNormal: false,
        message: `Blood pressure outside normal range (${bpRange.systolic.min}-${bpRange.systolic.max}/${bpRange.diastolic.min}-${bpRange.diastolic.max} mmHg)`,
      };
    }
    return { isNormal: true };
  }
  
  // Handle simple range
  if ('min' in range && 'max' in range) {
    const numValue = extractNumericValue(value);
    const simpleRange = range as { min: number; max: number; unit: string };
    
    if (numValue < simpleRange.min || numValue > simpleRange.max) {
      return {
        isNormal: false,
        message: `Value outside normal range (${simpleRange.min}-${simpleRange.max} ${simpleRange.unit})`,
      };
    }
  }
  
  return { isNormal: true };
}

/**
 * Get days until target date
 */
export function getDaysUntilTarget(targetDate: string): number {
  const target = new Date(targetDate);
  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(
  startValue: number,
  currentValue: number,
  targetValue: number
): number {
  const totalChange = targetValue - startValue;
  if (totalChange === 0) return 100;
  
  const actualChange = currentValue - startValue;
  const progress = (actualChange / totalChange) * 100;
  
  return Math.min(Math.max(progress, 0), 100);
}

/**
 * Format date for health records
 */
export function formatHealthDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for medication schedules
 */
export function formatMedicationTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Group measurements by date for charting
 */
export function groupMeasurementsByDate(
  measurements: HealthMeasurement[]
): Record<string, HealthMeasurement[]> {
  return measurements.reduce((acc, measurement) => {
    const date = new Date(measurement.measured_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(measurement);
    return acc;
  }, {} as Record<string, HealthMeasurement[]>);
}

/**
 * Calculate average value from measurements
 */
export function calculateAverageValue(measurements: HealthMeasurement[]): number {
  if (measurements.length === 0) return 0;
  
  const sum = measurements.reduce((acc, m) => acc + extractNumericValue(m.value), 0);
  return sum / measurements.length;
}
