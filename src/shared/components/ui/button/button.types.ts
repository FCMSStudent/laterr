import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/shared/lib/ui-utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Disable ripple effect
   * Set to true to disable Material-style ripple on click
   */
  disableRipple?: boolean;
}

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

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
