import { ReactNode } from 'react';

// Minimum height for viewer content area to ensure consistent sizing
const VIEWER_MIN_HEIGHT = '300px';

interface ViewerShellProps {
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shared viewer shell component that provides consistent layout for PDF and video viewers.
 * Features:
 * - Optional controls bar at the top with consistent styling
 * - Content area with consistent padding and background
 * - Consistent border radius and visual treatment
 */
export const ViewerShell = ({ controls, children, className = '' }: ViewerShellProps) => {
  const hasControls = Boolean(controls);
  const contentRoundedClass = hasControls ? 'rounded-b-xl' : 'rounded-xl';
  
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
        className={`flex-1 overflow-hidden bg-muted/30 ${contentRoundedClass} flex items-start justify-center`}
        style={{ minHeight: VIEWER_MIN_HEIGHT }}
      >
        {children}
      </div>
    </div>
  );
};
