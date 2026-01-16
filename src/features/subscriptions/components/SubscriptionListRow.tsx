import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/features/subscriptions/utils/currency-utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import type { Subscription } from '@/features/subscriptions/types';
import { cn } from '@/shared/lib/utils';

interface SubscriptionListRowProps {
  subscription: Subscription;
  onClick: () => void;
}

/**
 * Compact subscription row for list view.
 * Shows: icon/logo, name, price, next billing date in a single row.
 * Uses colored status dots instead of text badges.
 */
export const SubscriptionListRow = ({
  subscription,
  onClick,
}: SubscriptionListRowProps) => {
  const { name, amount, currency, next_billing_date, status } = subscription;

  // Calculate days until renewal
  const daysUntil = differenceInDays(parseISO(next_billing_date), new Date());
  const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
  const showCountdown = daysUntil >= 0 && daysUntil <= 14;

  // Status dot color
  const getStatusDotColor = () => {
    if (status === 'active') {
      if (isDueSoon) return 'bg-amber-500'; // 🟡 Due soon
      return 'bg-green-500'; // 🟢 Active
    }
    return 'bg-gray-400'; // ⚫ Paused/Cancelled
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 py-3 px-4 transition-colors',
        'border-b border-border/40 last:border-0',
        'cursor-pointer hover:bg-muted/50 active:bg-muted'
      )}
      aria-label={`${name} subscription - ${formatCurrency(amount, currency)}`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', getStatusDotColor())} aria-hidden="true" />
          <span className="font-medium text-sm text-foreground truncate">{name}</span>
        </div>
        {showCountdown ? (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {isDueSoon ? `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}` : format(parseISO(next_billing_date), 'MMM d, yyyy')}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {format(parseISO(next_billing_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="flex-shrink-0 text-sm font-semibold text-foreground">
        {formatCurrency(amount, currency)}
      </div>
    </button>
  );
};
