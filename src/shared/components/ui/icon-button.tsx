import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  /**
   * Accessible label for screen readers
   * Required for accessibility when button only contains an icon
   */
  "aria-label": string;
  /**
   * Size of the icon button
   * - default: 40x40px (h-10 w-10)
   * - sm: 36px (h-9 w-9)
   * - lg: 44x44px (h-11 w-11) - Recommended for mobile
   */
  size?: "default" | "sm" | "lg";
}

const iconButtonSizes = {
  default: "h-10 w-10",
  sm: "h-9 w-9",
  lg: "h-11 w-11",
};

/**
 * IconButton - A button component optimized for icon-only actions
 * 
 * Features:
 * - Square aspect ratio
 * - Proper touch targets (meets 44x44px guideline with lg size)
 * - Requires aria-label for accessibility
 * - Centered icon alignment
 * 
 * Usage:
 * ```tsx
 * <IconButton aria-label="Delete item" variant="ghost">
 *   <Trash2 className="h-4 w-4" />
 * </IconButton>
 * ```
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    return (
      <Button
        className={cn(iconButtonSizes[size], "p-0", className)}
        ref={ref}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

export { IconButton };
