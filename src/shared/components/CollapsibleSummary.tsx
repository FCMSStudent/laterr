import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface CollapsibleSummaryProps {
  /**
   * Summary text to display when collapsed
   */
  summary: string | ReactNode;
  /**
   * Current expanded state
   */
  expanded: boolean;
  /**
   * Callback when user clicks to toggle
   */
  onToggle: () => void;
  /**
   * Content to show when expanded
   */
  children: ReactNode;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Additional CSS classes for the summary section
   */
  summaryClassName?: string;
  /**
   * Additional CSS classes for the expanded content
   */
  contentClassName?: string;
}

/**
 * Reusable collapsible summary component for progressive disclosure pattern.
 * Shows a compact summary by default and expands to show detailed content on tap/click.
 * 
 * @example
 * ```tsx
 * const [expanded, setExpanded] = useState(false);
 * 
 * <CollapsibleSummary
 *   summary="$245/mo • 8 active • 2 due soon"
 *   expanded={expanded}
 *   onToggle={() => setExpanded(!expanded)}
 * >
 *   <div className="grid grid-cols-4 gap-4">
 *     // Detailed stats cards
 *   </div>
 * </CollapsibleSummary>
 * ```
 */
export const CollapsibleSummary = ({
  summary,
  expanded,
  onToggle,
  children,
  className,
  summaryClassName,
  contentClassName,
}: CollapsibleSummaryProps) => {
  return (
    <div className={cn('glass-card rounded-2xl p-3', className)}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity',
          summaryClassName
        )}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse details' : 'Expand details'}
      >
        <div className="flex-1 text-left">
          {typeof summary === 'string' ? (
            <span className="text-sm">{summary}</span>
          ) : (
            summary
          )}
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
        <div
          className={cn('mt-4 animate-in slide-in-from-top-2 duration-200', contentClassName)}
        >
          {children}
        </div>
      )}
    </div>
  );
};
