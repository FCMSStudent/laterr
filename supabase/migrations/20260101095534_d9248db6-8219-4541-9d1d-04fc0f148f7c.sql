-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    next_billing_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    payment_method TEXT,
    website_url TEXT,
    logo_url TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    reminder_days_before INTEGER NOT NULL DEFAULT 3,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC function for subscription totals
CREATE OR REPLACE FUNCTION public.get_subscription_totals(p_user_id UUID)
RETURNS TABLE(
    total_monthly NUMERIC,
    total_yearly NUMERIC,
    active_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(
            CASE 
                WHEN subscriptions.billing_cycle = 'weekly' THEN subscriptions.amount * 4.33
                WHEN subscriptions.billing_cycle = 'monthly' THEN subscriptions.amount
                WHEN subscriptions.billing_cycle = 'quarterly' THEN subscriptions.amount / 3
                WHEN subscriptions.billing_cycle = 'yearly' THEN subscriptions.amount / 12
                ELSE subscriptions.amount
            END
        ), 0)::NUMERIC as total_monthly,
        COALESCE(SUM(
            CASE 
                WHEN subscriptions.billing_cycle = 'weekly' THEN subscriptions.amount * 52
                WHEN subscriptions.billing_cycle = 'monthly' THEN subscriptions.amount * 12
                WHEN subscriptions.billing_cycle = 'quarterly' THEN subscriptions.amount * 4
                WHEN subscriptions.billing_cycle = 'yearly' THEN subscriptions.amount
                ELSE subscriptions.amount * 12
            END
        ), 0)::NUMERIC as total_yearly,
        COALESCE(COUNT(*)::INTEGER, 0) as active_count
    FROM subscriptions
    WHERE subscriptions.user_id = p_user_id
      AND subscriptions.status = 'active';
END;
$$;

-- Create RPC function for category analytics
CREATE OR REPLACE FUNCTION public.calculate_subscription_analytics(p_user_id UUID)
RETURNS TABLE(
    category TEXT,
    total_amount NUMERIC,
    monthly_equivalent NUMERIC,
    subscription_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        subscriptions.category,
        SUM(subscriptions.amount)::NUMERIC as total_amount,
        SUM(
            CASE 
                WHEN subscriptions.billing_cycle = 'weekly' THEN subscriptions.amount * 4.33
                WHEN subscriptions.billing_cycle = 'monthly' THEN subscriptions.amount
                WHEN subscriptions.billing_cycle = 'quarterly' THEN subscriptions.amount / 3
                WHEN subscriptions.billing_cycle = 'yearly' THEN subscriptions.amount / 12
                ELSE subscriptions.amount
            END
        )::NUMERIC as monthly_equivalent,
        COUNT(*)::INTEGER as subscription_count
    FROM subscriptions
    WHERE subscriptions.user_id = p_user_id
      AND subscriptions.status = 'active'
    GROUP BY subscriptions.category
    ORDER BY monthly_equivalent DESC;
END;
$$;

-- Create RPC function for upcoming renewals
CREATE OR REPLACE FUNCTION public.get_upcoming_renewals(p_user_id UUID, p_days_ahead INTEGER DEFAULT 14)
RETURNS TABLE(
    id UUID,
    name TEXT,
    amount NUMERIC,
    currency TEXT,
    billing_cycle TEXT,
    next_billing_date DATE,
    days_until_renewal INTEGER,
    logo_url TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        subscriptions.id,
        subscriptions.name,
        subscriptions.amount,
        subscriptions.currency,
        subscriptions.billing_cycle,
        subscriptions.next_billing_date,
        (subscriptions.next_billing_date - CURRENT_DATE)::INTEGER as days_until_renewal,
        subscriptions.logo_url,
        subscriptions.status
    FROM subscriptions
    WHERE subscriptions.user_id = p_user_id
      AND subscriptions.status = 'active'
      AND subscriptions.next_billing_date <= (CURRENT_DATE + p_days_ahead)
      AND subscriptions.next_billing_date >= CURRENT_DATE
    ORDER BY subscriptions.next_billing_date ASC;
END;
$$;