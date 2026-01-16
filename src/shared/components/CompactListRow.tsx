import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface CompactListRowProps {
  /**
   * Icon or image element to display on the left
   */
  icon?: ReactNode;
  /**
   * Primary title text
   */
  title: string;
  /**
   * Secondary subtitle text (optional)
   */
  subtitle?: string;
  /**
   * Content to display on the right side
   */
  trailing?: ReactNode;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether the row is selected/highlighted
   */
  selected?: boolean;
  /**
   * Accessibility label
   */
  ariaLabel?: string;
}

/**
 * Base component for compact list row views across modules.
 * Provides consistent styling with borderless design and subtle dividers.
 * 
 * @example
 * ```tsx
 * <CompactListRow
 *   icon={<CreditCard className="h-5 w-5" />}
 *   title="Netflix"
 *   subtitle="Next billing: Jan 15"
 *   trailing={<span className="font-semibold">$15.99</span>}
 *   onClick={() => handleClick()}
 * />
 * ```
 */
export const CompactListRow = ({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  className,
  selected = false,
  ariaLabel,
}: CompactListRowProps) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 py-3 px-4 transition-colors',
        'border-b border-border/40 last:border-0',
        onClick && 'cursor-pointer hover:bg-muted/50 active:bg-muted',
        selected && 'bg-primary/5 border-primary/30',
        className
      )}
      aria-label={ariaLabel || title}
      {...(onClick && { role: 'button', tabIndex: 0 })}
    >
      {icon && (
        <div className="flex-shrink-0 text-muted-foreground">
          {icon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      {trailing && (
        <div className="flex-shrink-0 text-sm">
          {trailing}
        </div>
      )}
    </Component>
  );
};
