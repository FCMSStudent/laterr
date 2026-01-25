import type { MeasurementType, DocumentType, GoalType, MedicationFrequency } from './types';

// Table name constants
export const HEALTH_TABLES = {
  MEASUREMENTS: 'health_measurements',
  DOCUMENTS: 'health_documents',
  GOALS: 'health_goals',
  INSIGHTS: 'health_insights',
  MEDICATIONS: 'medication_schedule',
} as const;

export const HEALTH_DOCUMENTS_STORAGE_BUCKET = 'health-documents' as const;
export const HEALTH_DOCUMENTS_STORAGE_FOLDER = '' as const;

// Measurement types with their default units
export const MEASUREMENT_TYPES: Record<MeasurementType, { label: string; unit: string; icon: string }> = {
  weight: { label: 'Weight', unit: 'kg', icon: 'Scale' },
  blood_pressure: { label: 'Blood Pressure', unit: 'mmHg', icon: 'Heart' },
  glucose: { label: 'Blood Glucose', unit: 'mg/dL', icon: 'Droplet' },
  heart_rate: { label: 'Heart Rate', unit: 'bpm', icon: 'Activity' },
  body_fat: { label: 'Body Fat', unit: '%', icon: 'Percent' },
  sleep_hours: { label: 'Sleep', unit: 'hours', icon: 'Moon' },
  steps: { label: 'Steps', unit: 'steps', icon: 'Footprints' },
  calories: { label: 'Calories', unit: 'kcal', icon: 'Flame' },
  temperature: { label: 'Temperature', unit: '°C', icon: 'Thermometer' },
  oxygen_saturation: { label: 'Oxygen Saturation', unit: '%', icon: 'Wind' },
};

// Document types
export const DOCUMENT_TYPES: Record<DocumentType, { label: string; icon: string; color: string }> = {
  lab_result: { label: 'Lab Result', icon: 'TestTube', color: '#4CAF50' },
  prescription: { label: 'Prescription', icon: 'Pill', color: '#2196F3' },
  medical_report: { label: 'Medical Report', icon: 'FileText', color: '#FF9800' },
  imaging: { label: 'Imaging', icon: 'Scan', color: '#9C27B0' },
  insurance: { label: 'Insurance', icon: 'Shield', color: '#607D8B' },
  vaccination: { label: 'Vaccination', icon: 'Syringe', color: '#00BCD4' },
  discharge_summary: { label: 'Discharge Summary', icon: 'ClipboardCheck', color: '#795548' },
  referral: { label: 'Referral', icon: 'Forward', color: '#E91E63' },
};

// Goal types with metadata
export const GOAL_TYPES: Record<GoalType, { label: string; icon: string; defaultUnit: string }> = {
  weight_loss: { label: 'Weight Loss', icon: 'TrendingDown', defaultUnit: 'kg' },
  weight_gain: { label: 'Weight Gain', icon: 'TrendingUp', defaultUnit: 'kg' },
  muscle_gain: { label: 'Muscle Gain', icon: 'Dumbbell', defaultUnit: 'kg' },
  cardio: { label: 'Cardio Fitness', icon: 'Heart', defaultUnit: 'min/week' },
  sleep: { label: 'Sleep Quality', icon: 'Moon', defaultUnit: 'hours/night' },
  nutrition: { label: 'Nutrition', icon: 'Apple', defaultUnit: 'calories' },
  hydration: { label: 'Hydration', icon: 'Droplets', defaultUnit: 'liters/day' },
  steps: { label: 'Daily Steps', icon: 'Footprints', defaultUnit: 'steps/day' },
};

// Medication frequencies
export const MEDICATION_FREQUENCIES: Record<MedicationFrequency, { label: string; timesPerDay: number }> = {
  once_daily: { label: 'Once daily', timesPerDay: 1 },
  twice_daily: { label: 'Twice daily', timesPerDay: 2 },
  three_times_daily: { label: 'Three times daily', timesPerDay: 3 },
  four_times_daily: { label: 'Four times daily', timesPerDay: 4 },
  weekly: { label: 'Weekly', timesPerDay: 0 },
  as_needed: { label: 'As needed', timesPerDay: 0 },
};

// Common medication time slots
export const MEDICATION_TIME_SLOTS = [
  { value: '06:00', label: 'Morning (6 AM)' },
  { value: '08:00', label: 'After Breakfast (8 AM)' },
  { value: '12:00', label: 'Noon (12 PM)' },
  { value: '14:00', label: 'After Lunch (2 PM)' },
  { value: '18:00', label: 'Evening (6 PM)' },
  { value: '20:00', label: 'After Dinner (8 PM)' },
  { value: '22:00', label: 'Before Bed (10 PM)' },
];

// Unit conversion factors
export const UNIT_CONVERSIONS = {
  weight: {
    kg_to_lbs: 2.20462,
    lbs_to_kg: 0.453592,
  },
  height: {
    cm_to_inches: 0.393701,
    inches_to_cm: 2.54,
    cm_to_feet: 0.0328084,
    feet_to_cm: 30.48,
  },
  temperature: {
    c_to_f: (c: number) => (c * 9/5) + 32,
    f_to_c: (f: number) => (f - 32) * 5/9,
  },
  glucose: {
    mgdl_to_mmol: 0.0555,
    mmol_to_mgdl: 18.0182,
  },
};

// Normal ranges for health metrics (for display purposes)
export const NORMAL_RANGES = {
  blood_pressure: {
    systolic: { min: 90, max: 120, unit: 'mmHg' },
    diastolic: { min: 60, max: 80, unit: 'mmHg' },
  },
  heart_rate: { min: 60, max: 100, unit: 'bpm' },
  glucose: { min: 70, max: 100, unit: 'mg/dL' },
  oxygen_saturation: { min: 95, max: 100, unit: '%' },
  temperature: { min: 36.1, max: 37.2, unit: '°C' },
  body_fat: {
    male: { min: 10, max: 20, unit: '%' },
    female: { min: 18, max: 28, unit: '%' },
  },
};

// BMI categories
export const BMI_CATEGORIES = [
  { min: 0, max: 18.5, label: 'Underweight', color: '#2196F3' },
  { min: 18.5, max: 25, label: 'Normal', color: '#4CAF50' },
  { min: 25, max: 30, label: 'Overweight', color: '#FF9800' },
  { min: 30, max: 35, label: 'Obese Class I', color: '#F44336' },
  { min: 35, max: 40, label: 'Obese Class II', color: '#D32F2F' },
  { min: 40, max: Infinity, label: 'Obese Class III', color: '#B71C1C' },
];

// Chart colors for health data visualization
export const HEALTH_CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  info: '#2196F3',
};

// Insight types
export const INSIGHT_TYPES = [
  'trend_analysis',
  'goal_progress',
  'anomaly_detection',
  'recommendation',
  'reminder',
  'achievement',
];
