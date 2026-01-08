-- Add missing columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS provider text,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Create subscription_transactions table
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  status text NOT NULL DEFAULT 'paid',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_transaction_status CHECK (status IN ('paid', 'pending', 'failed'))
);

-- Create subscription_categories table
CREATE TABLE IF NOT EXISTS public.subscription_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#8B9A7F',
  budget_limit numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on new tables
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_transactions
CREATE POLICY "Users can view own subscription_transactions"
  ON public.subscription_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscription_transactions"
  ON public.subscription_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription_transactions"
  ON public.subscription_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription_transactions"
  ON public.subscription_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for subscription_categories
CREATE POLICY "Users can view own subscription_categories"
  ON public.subscription_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscription_categories"
  ON public.subscription_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription_categories"
  ON public.subscription_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription_categories"
  ON public.subscription_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_user_id ON public.subscription_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_subscription_id ON public.subscription_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_categories_user_id ON public.subscription_categories(user_id);