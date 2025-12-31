import { DollarSign, TrendingUp, CreditCard, PieChart } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useSubscriptionAnalytics } from "../hooks/useSubscriptionAnalytics";
import { SpendingBreakdownChart } from "./SpendingBreakdownChart";
import { CURRENCIES } from "../types";

interface AnalyticsPanelProps {
  currency?: string;
}

export const AnalyticsPanel = ({ currency = "USD" }: AnalyticsPanelProps) => {
  const { totals, categoryAnalytics, averageCost, isLoading } = useSubscriptionAnalytics();

  const getCurrencySymbol = (curr: string) => {
    const found = CURRENCIES.find(c => c.value === curr);
    return found?.symbol ?? curr;
  };

  const currencySymbol = getCurrencySymbol(currency);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card rounded-2xl p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>

        {/* Chart Loading */}
        <div className="glass-card rounded-2xl p-5">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Cost */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Monthly</span>
          </div>
          <p className="text-2xl font-bold">
            {currencySymbol}{totals.total_monthly.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">per month</p>
        </div>

        {/* Yearly Cost */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Yearly</span>
          </div>
          <p className="text-2xl font-bold">
            {currencySymbol}{totals.total_yearly.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">per year</p>
        </div>

        {/* Active Count */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Active</span>
          </div>
          <p className="text-2xl font-bold">{totals.active_count}</p>
          <p className="text-xs text-muted-foreground mt-1">subscriptions</p>
        </div>

        {/* Average Cost */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <PieChart className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Average</span>
          </div>
          <p className="text-2xl font-bold">
            {currencySymbol}{averageCost.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">per subscription</p>
        </div>
      </div>

      {/* Spending Breakdown Chart */}
      {categoryAnalytics.length > 0 && (
        <SpendingBreakdownChart
          data={categoryAnalytics}
          currency={currency}
        />
      )}
    </div>
  );
};
