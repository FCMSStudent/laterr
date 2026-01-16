import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { SubscriptionStatus } from '@/features/subscriptions/types';

interface StatusFilterTabsProps {
  activeFilter: SubscriptionStatus | 'all' | 'due_soon';
  onFilterChange: (filter: SubscriptionStatus | 'all' | 'due_soon') => void;
  dueSoonCount?: number;
}

/**
 * Simplified status filter tabs for subscriptions.
 * 3 smart filters: All, Active, Due Soon
 * Uses segmented control / pill toggle style.
 */
export const StatusFilterTabs = ({
  activeFilter,
  onFilterChange,
  dueSoonCount = 0,
}: StatusFilterTabsProps) => {
  const filters: Array<{ value: SubscriptionStatus | 'all' | 'due_soon'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'due_soon', label: `Due Soon${dueSoonCount > 0 ? ` (${dueSoonCount})` : ''}` },
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              'h-8 px-3 rounded-md transition-all',
              activeFilter === filter.value 
                ? 'bg-background shadow-sm' 
                : 'hover:bg-background/50'
            )}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
