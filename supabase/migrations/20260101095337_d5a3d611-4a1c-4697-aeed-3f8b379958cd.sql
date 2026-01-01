-- Create health_measurements table
CREATE TABLE public.health_measurements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    measurement_type TEXT NOT NULL,
    value JSONB NOT NULL,
    unit TEXT,
    measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    source TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on health_measurements
ALTER TABLE public.health_measurements ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_measurements
CREATE POLICY "Users can view own health_measurements"
ON public.health_measurements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health_measurements"
ON public.health_measurements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health_measurements"
ON public.health_measurements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health_measurements"
ON public.health_measurements FOR DELETE
USING (auth.uid() = user_id);

-- Create health_documents table
CREATE TABLE public.health_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    provider_name TEXT,
    visit_date DATE,
    summary TEXT,
    extracted_data JSONB,
    embedding vector(1536),
    tags TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on health_documents
ALTER TABLE public.health_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_documents
CREATE POLICY "Users can view own health_documents"
ON public.health_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health_documents"
ON public.health_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health_documents"
ON public.health_documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health_documents"
ON public.health_documents FOR DELETE
USING (auth.uid() = user_id);

-- Create health_goals table
CREATE TABLE public.health_goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    goal_type TEXT NOT NULL,
    target_value JSONB NOT NULL,
    current_value JSONB,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    motivation TEXT,
    milestones JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on health_goals
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_goals
CREATE POLICY "Users can view own health_goals"
ON public.health_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health_goals"
ON public.health_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health_goals"
ON public.health_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health_goals"
ON public.health_goals FOR DELETE
USING (auth.uid() = user_id);

-- Create health_insights table
CREATE TABLE public.health_insights (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence_score NUMERIC,
    related_measurements UUID[],
    related_documents UUID[],
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    dismissed BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on health_insights
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_insights
CREATE POLICY "Users can view own health_insights"
ON public.health_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health_insights"
ON public.health_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health_insights"
ON public.health_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health_insights"
ON public.health_insights FOR DELETE
USING (auth.uid() = user_id);

-- Create function to find similar health documents
CREATE OR REPLACE FUNCTION public.find_similar_health_documents(
    query_embedding vector,
    match_threshold double precision DEFAULT 0.7,
    match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, title text, similarity double precision)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    health_documents.id,
    health_documents.title,
    1 - (health_documents.embedding <=> query_embedding) as similarity
  FROM health_documents
  WHERE health_documents.embedding IS NOT NULL
    AND health_documents.user_id = auth.uid()
    AND 1 - (health_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY health_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_health_documents_updated_at
BEFORE UPDATE ON public.health_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_goals_updated_at
BEFORE UPDATE ON public.health_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for health documents
INSERT INTO storage.buckets (id, name, public) VALUES ('health-documents', 'health-documents', false);

-- Create storage policies for health-documents bucket
CREATE POLICY "Users can view own health documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'health-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own health documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'health-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own health documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'health-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own health documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'health-documents' AND auth.uid()::text = (storage.foldername(name))[1]);