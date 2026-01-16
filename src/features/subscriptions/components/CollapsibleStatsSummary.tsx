import { useState } from 'react';
import { ChevronDown, DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/features/subscriptions/utils/currency-utils';

interface CollapsibleStatsSummaryProps {
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  dueSoonCount: number;
  currency?: string;
}

/**
 * Collapsible stats summary for subscriptions module.
 * Shows compact summary by default: "$245/mo • 8 active • 2 due soon"
 * Expands to show detailed 4-card breakdown on tap/click.
 */
export const CollapsibleStatsSummary = ({
  monthlyTotal,
  yearlyTotal,
  activeCount,
  dueSoonCount,
  currency = 'SAR',
}: CollapsibleStatsSummaryProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-card rounded-2xl p-3 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse stats details' : 'Expand stats details'}
      >
        <div className="flex-1 text-left">
          <span className="text-sm">
            <span className="font-semibold">{formatCurrency(monthlyTotal, currency)}/mo</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span>{activeCount} active</span>
            {dueSoonCount > 0 && (
              <>
                <span className="text-muted-foreground mx-2">•</span>
                <span className="text-amber-600 dark:text-amber-500">{dueSoonCount} due soon</span>
              </>
            )}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Monthly</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(monthlyTotal, currency)}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Yearly</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(yearlyTotal, currency)}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/50">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active</p>
              <p className="text-lg font-bold text-foreground">{activeCount}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Calendar className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Due in 7 days</p>
              <p className="text-lg font-bold text-foreground">{dueSoonCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
