import * as React from "react";
import { X, Check, AlertCircle, Eye, EyeOff, Search, Mail, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

// Base input component
const BaseInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300 shadow-sm focus-visible:shadow-md",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
BaseInput.displayName = "BaseInput";

// Icon map for common input types
const iconMap = {
  email: Mail,
  password: Lock,
  search: Search,
} as const;

export interface EnhancedInputProps extends Omit<React.ComponentProps<"input">, "prefix"> {
  // Validation props
  error?: string;
  success?: boolean;
  
  // Icon props
  prefixIcon?: React.ComponentType<{ className?: string }> | keyof typeof iconMap;
  suffixIcon?: React.ComponentType<{ className?: string }>;
  
  // Clear button
  showClearButton?: boolean;
  onClear?: () => void;
  
  // Floating label
  label?: string;
  floatingLabel?: boolean;
  
  // Password visibility toggle
  showPasswordToggle?: boolean;
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    type: initialType = "text",
    error,
    success,
    prefixIcon,
    suffixIcon,
    showClearButton = false,
    onClear,
    label,
    floatingLabel = false,
    showPasswordToggle = false,
    value,
    ...props 
  }, ref) => {
    const [type, setType] = React.useState(initialType);
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!value);
    
    React.useEffect(() => {
      setHasValue(!!value);
    }, [value]);
    
    // Auto-detect password toggle based on type
    const shouldShowPasswordToggle = showPasswordToggle || initialType === "password";
    
    // Auto-detect prefix icon based on type
    let PrefixIconComponent = null;
    if (prefixIcon) {
      if (typeof prefixIcon === "string" && prefixIcon in iconMap) {
        PrefixIconComponent = iconMap[prefixIcon as keyof typeof iconMap];
      } else if (typeof prefixIcon === "function") {
        PrefixIconComponent = prefixIcon;
      }
    } else if (initialType in iconMap && !floatingLabel) {
      PrefixIconComponent = iconMap[initialType as keyof typeof iconMap];
    }
    
    const handleClear = () => {
      if (onClear) {
        onClear();
      }
      setHasValue(false);
    };
    
    const togglePasswordVisibility = () => {
      setType(type === "password" ? "text" : "password");
    };
    
    const showSuccess = success && !error && hasValue;
    const showError = !!error;
    const showClear = showClearButton && hasValue && !props.disabled && !props.readOnly;
    
    const inputClasses = cn(
      "flex h-10 w-full rounded-lg border bg-background text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300 shadow-sm focus-visible:shadow-md",
      PrefixIconComponent && "pl-10",
      (showClear || shouldShowPasswordToggle || suffixIcon || showSuccess || showError) && "pr-10",
      (showClear && shouldShowPasswordToggle) && "pr-16",
      showError && "border-destructive focus-visible:ring-destructive",
      showSuccess && "border-success focus-visible:ring-success",
      floatingLabel && "placeholder-transparent pt-6 pb-2",
      className,
    );
    
    const containerClasses = cn(
      "relative w-full",
      floatingLabel && "relative"
    );
    
    return (
      <div className="w-full">
        <div className={containerClasses}>
          {/* Prefix Icon */}
          {PrefixIconComponent && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <PrefixIconComponent className="h-4 w-4" />
            </div>
          )}
          
          {/* Input */}
          <BaseInput
            ref={ref}
            type={type}
            className={inputClasses}
            value={value}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            onChange={(e) => {
              setHasValue(e.target.value.length > 0);
              props.onChange?.(e);
            }}
            aria-invalid={showError}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          />
          
          {/* Floating Label */}
          {floatingLabel && label && (
            <label
              htmlFor={props.id}
              className={cn(
                "absolute left-4 transition-all duration-200 pointer-events-none",
                PrefixIconComponent && "left-10",
                (isFocused || hasValue) 
                  ? "top-1.5 text-xs text-muted-foreground" 
                  : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
              )}
            >
              {label}
            </label>
          )}
          
          {/* Suffix Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Success Icon */}
            {showSuccess && !showError && (
              <Check className="h-4 w-4 text-success" aria-label="Valid input" />
            )}
            
            {/* Error Icon */}
            {showError && (
              <AlertCircle className="h-4 w-4 text-destructive" aria-label="Invalid input" />
            )}
            
            {/* Custom Suffix Icon */}
            {suffixIcon && !showSuccess && !showError && (
              <div className="text-muted-foreground">
                {React.createElement(suffixIcon, { className: "h-4 w-4" })}
              </div>
            )}
            
            {/* Clear Button */}
            {showClear && !shouldShowPasswordToggle && (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear input"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Password Toggle */}
            {shouldShowPasswordToggle && initialType === "password" && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={type === "password" ? "Show password" : "Hide password"}
                tabIndex={-1}
              >
                {type === "password" ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <p 
            id={`${props.id}-error`}
            className="text-sm text-destructive mt-1.5 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  },
);
EnhancedInput.displayName = "EnhancedInput";

// Keep the original Input component for backward compatibility
const Input = BaseInput;

export { Input, EnhancedInput, BaseInput };
