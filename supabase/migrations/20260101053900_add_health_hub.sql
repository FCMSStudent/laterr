-- Migration: Add Health Hub Module Tables and Functions
-- This migration creates the health_measurements, health_documents, health_goals, and health_insights tables
-- along with necessary functions for the health hub feature

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Health Measurements Table
-- ============================================
CREATE TABLE public.health_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL,
  value JSONB NOT NULL,
  unit TEXT,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes on health_measurements
CREATE INDEX IF NOT EXISTS health_measurements_user_id_idx ON public.health_measurements(user_id);
CREATE INDEX IF NOT EXISTS health_measurements_type_idx ON public.health_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS health_measurements_measured_at_idx ON public.health_measurements(measured_at);
CREATE INDEX IF NOT EXISTS health_measurements_user_type_date_idx ON public.health_measurements(user_id, measurement_type, measured_at DESC);

-- Enable RLS
ALTER TABLE public.health_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_measurements
CREATE POLICY "Users can view own measurements"
ON public.health_measurements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements"
ON public.health_measurements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements"
ON public.health_measurements FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements"
ON public.health_measurements FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Health Documents Table
-- ============================================
CREATE TABLE public.health_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  provider_name TEXT,
  visit_date DATE,
  summary TEXT,
  extracted_data JSONB DEFAULT '{}',
  embedding vector(1536),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes on health_documents
CREATE INDEX IF NOT EXISTS health_documents_user_id_idx ON public.health_documents(user_id);
CREATE INDEX IF NOT EXISTS health_documents_type_idx ON public.health_documents(document_type);
CREATE INDEX IF NOT EXISTS health_documents_visit_date_idx ON public.health_documents(visit_date);

-- Create index on embedding column for vector similarity search
CREATE INDEX IF NOT EXISTS health_documents_embedding_idx ON public.health_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.health_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_documents
CREATE POLICY "Users can view own documents"
ON public.health_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
ON public.health_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
ON public.health_documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
ON public.health_documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Health Goals Table
-- ============================================
CREATE TABLE public.health_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  target_value JSONB NOT NULL,
  current_value JSONB DEFAULT '{}',
  start_date DATE NOT NULL,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  motivation TEXT,
  milestones JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes on health_goals
CREATE INDEX IF NOT EXISTS health_goals_user_id_idx ON public.health_goals(user_id);
CREATE INDEX IF NOT EXISTS health_goals_status_idx ON public.health_goals(status);
CREATE INDEX IF NOT EXISTS health_goals_type_idx ON public.health_goals(goal_type);

-- Enable RLS
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_goals
CREATE POLICY "Users can view own goals"
ON public.health_goals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
ON public.health_goals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
ON public.health_goals FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
ON public.health_goals FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Health Insights Table
-- ============================================
CREATE TABLE public.health_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  related_measurements UUID[] DEFAULT '{}',
  related_documents UUID[] DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dismissed BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes on health_insights
CREATE INDEX IF NOT EXISTS health_insights_user_id_idx ON public.health_insights(user_id);
CREATE INDEX IF NOT EXISTS health_insights_type_idx ON public.health_insights(insight_type);
CREATE INDEX IF NOT EXISTS health_insights_generated_at_idx ON public.health_insights(generated_at DESC);
CREATE INDEX IF NOT EXISTS health_insights_dismissed_idx ON public.health_insights(dismissed);

-- Enable RLS
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_insights
CREATE POLICY "Users can view own insights"
ON public.health_insights FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
ON public.health_insights FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
ON public.health_insights FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
ON public.health_insights FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Database Functions
-- ============================================

-- Function to find similar health documents based on embeddings
CREATE OR REPLACE FUNCTION find_similar_health_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  document_type text,
  summary text,
  visit_date date,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hd.id,
    hd.title,
    hd.document_type,
    hd.summary,
    hd.visit_date,
    1 - (hd.embedding <=> query_embedding) as similarity
  FROM public.health_documents hd
  WHERE 
    hd.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR hd.user_id = user_id_filter)
    AND 1 - (hd.embedding <=> query_embedding) > match_threshold
  ORDER BY hd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get measurement trends
CREATE OR REPLACE FUNCTION get_measurement_trends(
  p_user_id UUID,
  p_measurement_type TEXT,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  avg_value DECIMAL,
  min_value DECIMAL,
  max_value DECIMAL,
  stddev_value DECIMAL,
  count INTEGER,
  trend TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_avg DECIMAL;
  v_older_avg DECIMAL;
BEGIN
  -- Calculate statistics for all measurements in the period
  SELECT 
    AVG((value->>'value')::DECIMAL),
    MIN((value->>'value')::DECIMAL),
    MAX((value->>'value')::DECIMAL),
    STDDEV((value->>'value')::DECIMAL),
    COUNT(*)::INTEGER
  INTO avg_value, min_value, max_value, stddev_value, count
  FROM public.health_measurements
  WHERE 
    user_id = p_user_id
    AND measurement_type = p_measurement_type
    AND measured_at >= (CURRENT_DATE - p_days_back)
    AND value ? 'value';
  
  -- Calculate trend by comparing recent half vs older half
  SELECT AVG((value->>'value')::DECIMAL)
  INTO v_recent_avg
  FROM public.health_measurements
  WHERE 
    user_id = p_user_id
    AND measurement_type = p_measurement_type
    AND measured_at >= (CURRENT_DATE - (p_days_back / 2))
    AND value ? 'value';
  
  SELECT AVG((value->>'value')::DECIMAL)
  INTO v_older_avg
  FROM public.health_measurements
  WHERE 
    user_id = p_user_id
    AND measurement_type = p_measurement_type
    AND measured_at >= (CURRENT_DATE - p_days_back)
    AND measured_at < (CURRENT_DATE - (p_days_back / 2))
    AND value ? 'value';
  
  -- Determine trend direction
  IF v_recent_avg IS NULL OR v_older_avg IS NULL THEN
    trend := 'insufficient_data';
  ELSIF v_recent_avg > v_older_avg * 1.05 THEN
    trend := 'increasing';
  ELSIF v_recent_avg < v_older_avg * 0.95 THEN
    trend := 'decreasing';
  ELSE
    trend := 'stable';
  END IF;
  
  RETURN NEXT;
END;
$$;

-- Function to calculate goal progress
CREATE OR REPLACE FUNCTION calculate_goal_progress(
  p_user_id UUID,
  p_goal_id UUID DEFAULT NULL
)
RETURNS TABLE (
  goal_id UUID,
  goal_type TEXT,
  target_value JSONB,
  current_value JSONB,
  progress_percentage DECIMAL,
  days_remaining INTEGER,
  on_track BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as goal_id,
    g.goal_type,
    g.target_value,
    g.current_value,
    CASE 
      WHEN (g.target_value->>'value')::DECIMAL > 0 THEN
        ((g.current_value->>'value')::DECIMAL / (g.target_value->>'value')::DECIMAL * 100)::DECIMAL
      ELSE 0
    END as progress_percentage,
    CASE 
      WHEN g.target_date IS NOT NULL THEN
        (g.target_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_remaining,
    CASE 
      WHEN g.target_date IS NULL THEN true
      WHEN (g.target_date - CURRENT_DATE) <= 0 THEN 
        ((g.current_value->>'value')::DECIMAL >= (g.target_value->>'value')::DECIMAL)
      ELSE true
    END as on_track
  FROM public.health_goals g
  WHERE 
    g.user_id = p_user_id
    AND g.status = 'active'
    AND (p_goal_id IS NULL OR g.id = p_goal_id);
END;
$$;

-- Function to aggregate health summary
CREATE OR REPLACE FUNCTION aggregate_health_summary(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  measurement_count INTEGER,
  document_count INTEGER,
  active_goals_count INTEGER,
  recent_insights_count INTEGER,
  measurement_types TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER 
     FROM public.health_measurements 
     WHERE user_id = p_user_id 
     AND measured_at >= (CURRENT_DATE - p_days_back)) as measurement_count,
    (SELECT COUNT(*)::INTEGER 
     FROM public.health_documents 
     WHERE user_id = p_user_id) as document_count,
    (SELECT COUNT(*)::INTEGER 
     FROM public.health_goals 
     WHERE user_id = p_user_id 
     AND status = 'active') as active_goals_count,
    (SELECT COUNT(*)::INTEGER 
     FROM public.health_insights 
     WHERE user_id = p_user_id 
     AND generated_at >= (CURRENT_DATE - p_days_back)
     AND dismissed = false) as recent_insights_count,
    (SELECT ARRAY_AGG(DISTINCT measurement_type) 
     FROM public.health_measurements 
     WHERE user_id = p_user_id 
     AND measured_at >= (CURRENT_DATE - p_days_back)) as measurement_types;
END;
$$;

-- Trigger to update timestamps on health_documents table
CREATE OR REPLACE FUNCTION update_health_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_documents_updated_at
BEFORE UPDATE ON public.health_documents
FOR EACH ROW
EXECUTE FUNCTION update_health_documents_updated_at();

-- Trigger to update timestamps on health_goals table
CREATE OR REPLACE FUNCTION update_health_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_goals_updated_at
BEFORE UPDATE ON public.health_goals
FOR EACH ROW
EXECUTE FUNCTION update_health_goals_updated_at();

-- ============================================
-- Storage bucket for health documents
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('health-documents', 'health-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for health-documents bucket
CREATE POLICY "Users can upload their health documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'health-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own health documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'health-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own health documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'health-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own health documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'health-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
