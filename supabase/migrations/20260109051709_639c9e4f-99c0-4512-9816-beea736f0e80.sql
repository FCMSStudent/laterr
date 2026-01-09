-- Create medication_schedule table
CREATE TABLE public.medication_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  time_of_day TIME[] DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medication_schedule ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own medication_schedule"
  ON public.medication_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own medication_schedule"
  ON public.medication_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medication_schedule"
  ON public.medication_schedule FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medication_schedule"
  ON public.medication_schedule FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_medication_schedule_user_id ON public.medication_schedule(user_id);
CREATE INDEX idx_medication_schedule_start_date ON public.medication_schedule(start_date);

-- Add trigger for updated_at
CREATE TRIGGER update_medication_schedule_updated_at
  BEFORE UPDATE ON public.medication_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();