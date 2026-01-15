import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/ui-utils";
import { useRipple } from "@/hooks/useRipple";

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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disableRipple = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const handleRipple = useRipple();
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disableRipple && !props.disabled) {
        handleRipple(e);
      }
      onClick?.(e);
    };
    
    return (
      <Comp 
        className={cn(
          buttonVariants({ variant, size, className }),
          !disableRipple && "relative overflow-hidden"
        )} 
        ref={ref} 
        onClick={asChild ? onClick : handleClick}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
