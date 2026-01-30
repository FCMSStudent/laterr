import { ReactNode } from 'react';

// Minimum height for viewer content area to ensure consistent sizing
const VIEWER_MIN_HEIGHT = '300px';

interface ViewerShellProps {
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Whether the content area should be scrollable. Default: false (parent owns scroll) */
  scrollable?: boolean;
  /** Disable default flex sizing and centering to allow content to shrink-wrap. */
  shrinkWrap?: boolean;
}

/**
 * Shared viewer shell component that provides consistent layout for PDF and video viewers.
 * Features:
 * - Optional controls bar at the top with consistent styling
 * - Content area with consistent padding and background
 * - Consistent border radius and visual treatment
 * - Configurable scroll behavior (default: no scroll, parent owns scroll)
 */
export const ViewerShell = ({
  controls,
  children,
  className = '',
  scrollable = false,
  shrinkWrap = false,
}: ViewerShellProps) => {
  const hasControls = Boolean(controls);
  const contentRoundedClass = hasControls ? 'rounded-b-xl' : 'rounded-xl';
  const scrollClass = scrollable ? 'overflow-y-auto' : 'overflow-hidden';
  const contentFlexClass = shrinkWrap ? '' : 'flex-1';
  const contentAlignmentClass = shrinkWrap ? '' : 'flex items-center justify-center';

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Controls bar - only rendered if controls are provided */}
      {hasControls && (
        <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-t-xl border-b border-border/50">
          {controls}
        </div>
      )}

      {/* Content area */}
      <div
        className={`${contentFlexClass} min-h-0 ${scrollClass} bg-muted/30 ${contentRoundedClass} ${scrollable ? '' : contentAlignmentClass
          }`}
        style={shrinkWrap ? undefined : { minHeight: VIEWER_MIN_HEIGHT }}
      >
        {children}
      </div>
    </div>
  );
};
