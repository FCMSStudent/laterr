import { CreditCard, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { format } from "date-fns";
import { useUpcomingRenewals } from "../hooks/useUpcomingRenewals";
import { CURRENCIES } from "../types";

interface UpcomingRenewalsPanelProps {
  onSubscriptionClick?: (id: string) => void;
}

export const UpcomingRenewalsPanel = ({
  onSubscriptionClick,
}: UpcomingRenewalsPanelProps) => {
  const { renewals, isLoading, getUrgencyLevel } = useUpcomingRenewals({ daysAhead: 14 });

  const getCurrencySymbol = (curr: string) => {
    const found = CURRENCIES.find(c => c.value === curr);
    return found?.symbol ?? curr;
  };

  const getUrgencyColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
    }
  };

  const formatRenewalDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d");
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Upcoming Renewals
        </h3>
        {renewals.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {renewals.length}
          </Badge>
        )}
      </div>

      {renewals.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            No renewals in the next 2 weeks
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            You're all caught up! 🎉
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {renewals.map(renewal => {
            const urgency = getUrgencyLevel(renewal.days_until_renewal);
            
            return (
              <button
                key={renewal.id}
                onClick={() => onSubscriptionClick?.(renewal.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 premium-transition text-left group"
              >
                {/* Logo */}
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                  {renewal.logo_url ? (
                    <img
                      src={renewal.logo_url}
                      alt={renewal.name}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <CreditCard className="h-5 w-5 text-muted-foreground/60" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{renewal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCurrencySymbol(renewal.currency)}{renewal.amount.toFixed(2)}
                  </p>
                </div>

                {/* Date badge */}
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${getUrgencyColor(urgency)}`}
                >
                  {renewal.days_until_renewal === 0
                    ? "Today"
                    : renewal.days_until_renewal === 1
                    ? "Tomorrow"
                    : formatRenewalDate(renewal.next_billing_date)}
                </Badge>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground premium-transition shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
