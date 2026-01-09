// Measurement types
export type MeasurementType = 
  | 'weight'
  | 'blood_pressure'
  | 'glucose'
  | 'heart_rate'
  | 'body_fat'
  | 'sleep_hours'
  | 'steps'
  | 'calories'
  | 'temperature'
  | 'oxygen_saturation';

// Document types
export type DocumentType = 
  | 'lab_result'
  | 'prescription'
  | 'medical_report'
  | 'imaging'
  | 'insurance'
  | 'vaccination'
  | 'discharge_summary'
  | 'referral';

// Goal types
export type GoalType = 
  | 'weight_loss'
  | 'weight_gain'
  | 'muscle_gain'
  | 'cardio'
  | 'sleep'
  | 'nutrition'
  | 'hydration'
  | 'steps';

// Goal status
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

// Medication frequency
export type MedicationFrequency = 
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'weekly'
  | 'as_needed';

// Health measurement interface (matches existing DB schema)
export interface HealthMeasurement {
  id: string;
  user_id: string;
  measurement_type: MeasurementType;
  value: Record<string, unknown>; // JSON value for flexible data (e.g., {systolic: 120, diastolic: 80})
  unit: string | null;
  source: string | null;
  notes: string | null;
  tags: string[] | null;
  measured_at: string;
  created_at: string;
}

// Blood pressure specific value
export interface BloodPressureValue {
  systolic: number;
  diastolic: number;
}

// Simple numeric value
export interface NumericValue {
  value: number;
}

// Health document interface (matches existing DB schema)
export interface HealthDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  title: string;
  file_url: string;
  file_type: string;
  provider_name: string | null;
  visit_date: string | null;
  summary: string | null;
  embedding: string | null;
  tags: string[] | null;
  extracted_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Health goal interface (matches existing DB schema)
export interface HealthGoal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  target_value: Record<string, unknown>;
  current_value: Record<string, unknown> | null;
  start_date: string;
  target_date: string | null;
  status: GoalStatus;
  motivation: string | null;
  milestones: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
}

// Health insight interface (matches existing DB schema)
export interface HealthInsight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  content: string;
  confidence_score: number | null;
  related_measurements: string[] | null;
  related_documents: string[] | null;
  dismissed: boolean;
  generated_at: string;
}

// Medication schedule interface
export interface MedicationSchedule {
  id: string;
  user_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: string;
  end_date: string | null;
  notes: string | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Analytics interfaces
export interface MeasurementTrend {
  type: MeasurementType;
  direction: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
  latestValue: number;
  previousValue: number;
  unit: string;
}

export interface HealthAnalytics {
  measurementTrends: MeasurementTrend[];
  activeGoals: number;
  completedGoals: number;
  upcomingMedications: MedicationSchedule[];
  recentDocuments: HealthDocument[];
  insights: HealthInsight[];
  weeklyMeasurementCount: number;
  averages: Record<MeasurementType, number>;
}

// Form data interfaces
export interface HealthMeasurementFormData {
  measurement_type: MeasurementType;
  value: number;
  systolic?: number;
  diastolic?: number;
  unit: string;
  source?: string;
  notes?: string;
  tags?: string[];
  measured_at: Date;
}

export interface HealthDocumentFormData {
  document_type: DocumentType;
  title: string;
  file: File;
  provider_name?: string;
  visit_date?: Date;
  summary?: string;
  tags?: string[];
}

export interface HealthGoalFormData {
  goal_type: GoalType;
  target_value: number;
  current_value?: number;
  unit: string;
  start_date: Date;
  target_date?: Date;
  motivation?: string;
}

export interface MedicationFormData {
  medication_name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: Date;
  end_date?: Date;
  notes?: string;
  reminder_enabled: boolean;
}
