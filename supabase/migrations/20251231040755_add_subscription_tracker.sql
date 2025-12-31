-- Migration: Add Subscription Tracker Module Tables and Functions
-- This migration creates the subscriptions, subscription_payments, and subscription_analytics tables
-- along with necessary functions for the subscription tracker feature

-- ============================================
-- Subscriptions Table
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  next_billing_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  payment_method TEXT,
  website_url TEXT,
  logo_url TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  reminder_days_before INTEGER NOT NULL DEFAULT 3 CHECK (reminder_days_before >= 0),
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on user_id for fast queries
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);

-- Create index on next_billing_date for renewal queries
CREATE INDEX IF NOT EXISTS subscriptions_next_billing_date_idx ON public.subscriptions(next_billing_date);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Subscription Payments Table (Transaction History)
-- ============================================
CREATE TABLE public.subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS subscription_payments_subscription_id_idx ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS subscription_payments_user_id_idx ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS subscription_payments_payment_date_idx ON public.subscription_payments(payment_date);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_payments
CREATE POLICY "Users can view own payments"
ON public.subscription_payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
ON public.subscription_payments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
ON public.subscription_payments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments"
ON public.subscription_payments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Subscription Analytics Table (Pre-computed Aggregates)
-- ============================================
CREATE TABLE public.subscription_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_monthly_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_yearly_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  active_count INTEGER NOT NULL DEFAULT 0,
  by_category JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS subscription_analytics_user_id_idx ON public.subscription_analytics(user_id);
CREATE INDEX IF NOT EXISTS subscription_analytics_period_idx ON public.subscription_analytics(period_start, period_end);

-- Enable RLS
ALTER TABLE public.subscription_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_analytics
CREATE POLICY "Users can view own analytics"
ON public.subscription_analytics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
ON public.subscription_analytics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics"
ON public.subscription_analytics FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics"
ON public.subscription_analytics FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Database Functions
-- ============================================

-- Function to get upcoming renewals for a user
CREATE OR REPLACE FUNCTION get_upcoming_renewals(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  amount DECIMAL(10, 2),
  currency TEXT,
  billing_cycle TEXT,
  next_billing_date DATE,
  days_until_renewal INTEGER,
  logo_url TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.amount,
    s.currency,
    s.billing_cycle,
    s.next_billing_date,
    (s.next_billing_date - CURRENT_DATE)::INTEGER as days_until_renewal,
    s.logo_url,
    s.status
  FROM public.subscriptions s
  WHERE 
    s.user_id = p_user_id
    AND s.status = 'active'
    AND s.next_billing_date <= (CURRENT_DATE + p_days_ahead)
    AND s.next_billing_date >= CURRENT_DATE
  ORDER BY s.next_billing_date ASC;
END;
$$;

-- Function to calculate subscription analytics for a user
CREATE OR REPLACE FUNCTION calculate_subscription_analytics(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  category TEXT,
  total_amount DECIMAL(10, 2),
  monthly_equivalent DECIMAL(10, 2),
  subscription_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.category,
    SUM(s.amount)::DECIMAL(10, 2) as total_amount,
    SUM(
      CASE s.billing_cycle
        WHEN 'weekly' THEN s.amount * 4.33
        WHEN 'monthly' THEN s.amount
        WHEN 'quarterly' THEN s.amount / 3
        WHEN 'yearly' THEN s.amount / 12
        ELSE s.amount
      END
    )::DECIMAL(10, 2) as monthly_equivalent,
    COUNT(*)::INTEGER as subscription_count
  FROM public.subscriptions s
  WHERE 
    s.user_id = p_user_id
    AND s.status = 'active'
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
  GROUP BY s.category
  ORDER BY monthly_equivalent DESC;
END;
$$;

-- Function to get total monthly and yearly costs for a user
CREATE OR REPLACE FUNCTION get_subscription_totals(p_user_id UUID)
RETURNS TABLE (
  total_monthly DECIMAL(10, 2),
  total_yearly DECIMAL(10, 2),
  active_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE s.billing_cycle
        WHEN 'weekly' THEN s.amount * 4.33
        WHEN 'monthly' THEN s.amount
        WHEN 'quarterly' THEN s.amount / 3
        WHEN 'yearly' THEN s.amount / 12
        ELSE s.amount
      END
    ), 0)::DECIMAL(10, 2) as total_monthly,
    COALESCE(SUM(
      CASE s.billing_cycle
        WHEN 'weekly' THEN s.amount * 52
        WHEN 'monthly' THEN s.amount * 12
        WHEN 'quarterly' THEN s.amount * 4
        WHEN 'yearly' THEN s.amount
        ELSE s.amount * 12
      END
    ), 0)::DECIMAL(10, 2) as total_yearly,
    COUNT(*)::INTEGER as active_count
  FROM public.subscriptions s
  WHERE 
    s.user_id = p_user_id
    AND s.status = 'active';
END;
$$;

-- Trigger to update timestamps on subscriptions table
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Storage bucket for subscription logos
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('subscription-logos', 'subscription-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for subscription-logos bucket
CREATE POLICY "Users can upload subscription logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'subscription-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view subscription logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'subscription-logos');

CREATE POLICY "Users can delete their own subscription logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'subscription-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
