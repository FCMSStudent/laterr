import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/ui";
import { Button } from "@/ui";
import { LoadingButton } from "@/ui";
import { Badge } from "@/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui";
import { Breadcrumbs } from "@/shared/components/Breadcrumbs";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  ExternalLink,
  Check,
  Pause,
  Ban,
  Edit,
  DollarSign,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { SUBSCRIPTION_TABLES, CATEGORY_COLORS } from "@/features/subscriptions/constants";
import { formatCurrency, calculateMonthlyCost, calculateAnnualCost, formatBillingCycle } from "@/features/subscriptions/utils/currency-utils";
import type { Subscription, SubscriptionBillingCycle, SubscriptionTransaction, SubscriptionStatus } from "@/features/subscriptions/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SubscriptionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  onUpdate: () => void;
}

export const SubscriptionDetailModal = ({
  open,
  onOpenChange,
  subscription,
  onUpdate
}: SubscriptionDetailModalProps) => {
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!subscription) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from(SUBSCRIPTION_TABLES.TRANSACTIONS)
        .select('*')
        .eq('subscription_id', subscription.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []).map(t => ({
        ...t,
        status: t.status as SubscriptionTransaction['status'],
      })));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [subscription]);

  useEffect(() => {
    if (open && subscription) {
      fetchTransactions();
    }
  }, [open, subscription, fetchTransactions]);

  const handleMarkAsPaid = async () => {
    if (!subscription) return;
    
    setActionLoading('paid');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert transaction
      const { error: transactionError } = await supabase
        .from(SUBSCRIPTION_TABLES.TRANSACTIONS)
        .insert({
          subscription_id: subscription.id,
          user_id: user.id,
          amount: subscription.amount,
          transaction_date: new Date().toISOString().split('T')[0],
          status: 'paid',
        });

      if (transactionError) throw transactionError;

      toast.success("Payment recorded!");
      fetchTransactions();
      onUpdate();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error("Failed to record payment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (newStatus: SubscriptionStatus) => {
    if (!subscription) return;
    
    setActionLoading(newStatus);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from(SUBSCRIPTION_TABLES.SUBSCRIPTIONS)
        .update(updateData)
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success(`Subscription ${newStatus}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  if (!subscription) return null;

  const monthlyAmount = calculateMonthlyCost(subscription.amount, subscription.billing_cycle as SubscriptionBillingCycle);
  const yearlyAmount = calculateAnnualCost(subscription.amount, subscription.billing_cycle as SubscriptionBillingCycle);
  const daysUntilRenewal = differenceInDays(parseISO(subscription.next_billing_date), new Date());
  const categoryColor = CATEGORY_COLORS[subscription.category] || CATEGORY_COLORS.Other;

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Prepare chart data from transactions
  const chartData = transactions
    .slice()
    .reverse()
    .map((t) => ({
      date: format(parseISO(t.transaction_date), 'MMM yyyy'),
      amount: t.amount,
    }));

  const breadcrumbItems = [
    { label: "Subscriptions", onClick: () => onOpenChange(false) },
    { label: subscription.category },
    { label: subscription.name },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto border-0 glass-card">
        <DialogHeader>
          <Breadcrumbs items={breadcrumbItems} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: categoryColor }}
              />
              <DialogTitle className="text-xl font-semibold">{subscription.name}</DialogTitle>
              <Badge variant="outline" className={getStatusColor(subscription.status as SubscriptionStatus)}>
                {subscription.status}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </DialogHeader>
        <DialogDescription className="sr-only">Subscription details</DialogDescription>

        <div className="flex flex-col md:flex-row gap-8 mt-4 w-full overflow-hidden">
          {/* LEFT COLUMN - Details */}
          <div className="md:w-1/3 flex flex-col gap-4 min-w-0">
            {/* Provider + Category */}
            {subscription.provider && (
              <div>
                <span className="text-xs text-muted-foreground font-medium">Provider</span>
                <p className="text-sm font-medium">{subscription.provider}</p>
              </div>
            )}

            <div>
              <span className="text-xs text-muted-foreground font-medium">Category</span>
              <Badge variant="secondary" className="ml-2">{subscription.category}</Badge>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Per {formatBillingCycle(subscription.billing_cycle as SubscriptionBillingCycle)}</span>
                <span className="text-xl font-bold">{formatCurrency(subscription.amount, subscription.currency)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Monthly equivalent</span>
                <span className="text-sm">{formatCurrency(monthlyAmount, subscription.currency)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Yearly</span>
                <span className="text-sm font-semibold">{formatCurrency(yearlyAmount, subscription.currency)}</span>
              </div>
            </div>

            {/* Next Billing */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Next billing: {format(parseISO(subscription.next_billing_date), 'PPP')}</span>
            </div>
            {daysUntilRenewal >= 0 && (
              <Badge variant="outline" className={daysUntilRenewal <= 7 ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : ''}>
                {daysUntilRenewal === 0 ? 'Due today' : `Renews in ${daysUntilRenewal} days`}
              </Badge>
            )}

            {/* Payment Method */}
            {subscription.payment_method && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{subscription.payment_method}</span>
              </div>
            )}

            {/* Auto Renew */}
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span>Auto-renew: {subscription.auto_renew ? 'Yes' : 'No'}</span>
            </div>

            {/* Website */}
            {subscription.website_url && (
              <a
                href={subscription.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Visit Website
              </a>
            )}

            {/* Tags */}
            {subscription.tags && subscription.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subscription.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Notes */}
            {subscription.notes && (
              <div>
                <span className="text-xs text-muted-foreground font-medium">Notes</span>
                <p className="text-sm mt-1">{subscription.notes}</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Tabs */}
          <div className="md:flex-1 flex flex-col gap-6 min-w-0">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="history">Payment History</TabsTrigger>
                <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-4">
                {loadingTransactions ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No payment history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(t.transaction_date), 'PPP')}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              t.status === 'paid'
                                ? 'bg-green-500/10 text-green-600'
                                : t.status === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-600'
                                : 'bg-red-500/10 text-red-600'
                            }
                          >
                            {t.status}
                          </Badge>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(t.amount, subscription.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analysis" className="mt-4">
                {chartData.length < 2 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Need at least 2 payments for cost analysis
                    </p>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <LoadingButton
                onClick={handleMarkAsPaid}
                loading={actionLoading === 'paid'}
                size="sm"
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Mark as Paid
              </LoadingButton>

              {subscription.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('paused')}
                  disabled={actionLoading === 'paused'}
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}

              {subscription.status === 'paused' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('active')}
                  disabled={actionLoading === 'active'}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Resume
                </Button>
              )}

              {subscription.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={actionLoading === 'cancelled'}
                  className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
                >
                  <Ban className="h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
