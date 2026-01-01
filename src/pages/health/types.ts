/**
 * Type definitions for the Health Hub module
 */

// Measurement Types
export type MeasurementType = 
  | 'weight'
  | 'blood_pressure'
  | 'heart_rate'
  | 'blood_glucose'
  | 'steps'
  | 'sleep_hours'
  | 'water_intake'
  | 'temperature'
  | 'oxygen_saturation'
  | 'custom';

export type MeasurementSource = 
  | 'manual'
  | 'apple_health'
  | 'google_fit'
  | 'fitbit'
  | 'device';

export interface MeasurementValue {
  value?: number;
  systolic?: number;
  diastolic?: number;
  unit?: string;
  // Flexible index signature to support custom measurement types with arbitrary properties
  // This is intentional to allow users to create custom health metrics
  [key: string]: string | number | boolean | undefined;
}

export interface HealthMeasurement {
  id: string;
  user_id: string;
  measurement_type: MeasurementType | string;
  value: MeasurementValue;
  unit?: string;
  measured_at: string;
  source: MeasurementSource;
  notes?: string;
  tags: string[];
  created_at: string;
}

export interface MeasurementFormData {
  measurement_type: MeasurementType | string;
  value: MeasurementValue;
  unit?: string;
  measured_at: string;
  source?: MeasurementSource;
  notes?: string;
  tags?: string[];
}

// Document Types
export type DocumentType = 
  | 'lab_result'
  | 'prescription'
  | 'imaging'
  | 'visit_summary'
  | 'insurance'
  | 'vaccination'
  | 'other';

export interface TestResult {
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status?: 'normal' | 'abnormal' | 'high' | 'low' | 'critical';
}

export interface Medication {
  name: string;
  dosage: string;
  frequency?: string;
  duration?: string;
}

export interface ExtractedHealthData {
  test_results?: TestResult[];
  medications?: Medication[];
  diagnoses?: string[];
  recommendations?: string[];
  summary?: string;
  provider_name?: string;
  visit_date?: string;
  // Allow additional fields for flexibility in medical data extraction
  // Values are constrained to safe JSON-serializable types
  [key: string]: string | string[] | TestResult[] | Medication[] | number | boolean | null | undefined;
}

export interface HealthDocument {
  id: string;
  user_id: string;
  title: string;
  document_type: DocumentType;
  file_url: string;
  file_type: string;
  provider_name?: string;
  visit_date?: string;
  summary?: string;
  extracted_data: ExtractedHealthData;
  embedding?: number[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DocumentFormData {
  title: string;
  document_type: DocumentType;
  provider_name?: string;
  visit_date?: string;
  tags?: string[];
}

// Goal Types
export type GoalType = 
  | 'weight_loss'
  | 'weight_gain'
  | 'steps_daily'
  | 'water_intake_daily'
  | 'exercise_frequency'
  | 'sleep_hours'
  | 'custom';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface GoalValue {
  value?: number;
  unit?: string;
  daily?: number;
  weekly?: number;
  [key: string]: string | number | undefined;
}

export interface Milestone {
  description: string;
  target_value: number;
  achieved: boolean;
  achieved_at?: string;
}

export interface HealthGoal {
  id: string;
  user_id: string;
  goal_type: GoalType | string;
  target_value: GoalValue;
  current_value: GoalValue;
  start_date: string;
  target_date?: string;
  status: GoalStatus;
  motivation?: string;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

export interface GoalFormData {
  goal_type: GoalType | string;
  target_value: GoalValue;
  start_date: string;
  target_date?: string;
  motivation?: string;
  milestones?: Milestone[];
}

// Insight Types
export type InsightType = 
  | 'trend'
  | 'anomaly'
  | 'recommendation'
  | 'summary';

export interface HealthInsight {
  id: string;
  user_id: string;
  insight_type: InsightType;
  title: string;
  content: string;
  confidence_score?: number;
  related_measurements: string[];
  related_documents: string[];
  generated_at: string;
  dismissed: boolean;
}

// Trend Analysis Types
export interface MeasurementTrend {
  avg_value: number;
  min_value: number;
  max_value: number;
  stddev_value: number;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
}

// Goal Progress Types
export interface GoalProgress {
  goal_id: string;
  goal_type: string;
  target_value: GoalValue;
  current_value: GoalValue;
  progress_percentage: number;
  days_remaining?: number;
  on_track: boolean;
}

// Health Summary Types
export interface HealthSummary {
  measurement_count: number;
  document_count: number;
  active_goals_count: number;
  recent_insights_count: number;
  measurement_types: string[];
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MultiSeriesDataPoint {
  date: string;
  [key: string]: string | number;
}
