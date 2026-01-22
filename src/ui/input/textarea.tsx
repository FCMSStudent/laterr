import * as React from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// Base textarea component for backward compatibility
const BaseTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  ...props
}, ref) => {
  return <textarea className={cn("flex min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm focus-visible:shadow-md", className)} ref={ref} {...props} />;
});
BaseTextarea.displayName = "BaseTextarea";
export interface EnhancedTextareaProps extends TextareaProps {
  // Character counter
  showCharacterCount?: boolean;
  characterCountThreshold?: number; // Show warning when this percentage is reached (default 0.9)

  // Validation
  error?: string;
  success?: boolean;

  // Label
  label?: string;
  helperText?: string;
}
const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(({
  className,
  showCharacterCount = true,
  characterCountThreshold = 0.9,
  maxLength,
  error,
  success,
  label,
  helperText,
  value,
  ...props
}, ref) => {
  const [charCount, setCharCount] = React.useState(typeof value === "string" ? value.length : 0);
  React.useEffect(() => {
    if (typeof value === "string") {
      setCharCount(value.length);
    }
  }, [value]);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
    props.onChange?.(e);
  };
  const showError = !!error;
  const showSuccess = success && !error && charCount > 0;
  const isNearLimit = maxLength && charCount > maxLength * characterCountThreshold;
  const remaining = maxLength ? maxLength - charCount : null;
  const textareaClasses = cn("flex min-h-[80px] w-full rounded-lg border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm focus-visible:shadow-md", showError && "border-destructive focus-visible:ring-destructive", showSuccess && "border-success focus-visible:ring-success", className);
  return <div className="w-full space-y-2">
        {/* Label */}
        {label && <label htmlFor={props.id} className={cn("text-sm font-medium leading-none", showError && "text-destructive")}>
            {label}
          </label>}
        
        {/* Textarea */}
        <BaseTextarea ref={ref} className={textareaClasses} value={value} maxLength={maxLength} onChange={handleChange} aria-invalid={showError} aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined} {...props} />
        
        {/* Footer: Helper text, error message, and character counter */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            {/* Error Message */}
            {error && <p id={`${props.id}-error`} className="text-sm text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error}
              </p>}
            
            {/* Helper Text */}
            {!error && helperText && <p id={`${props.id}-helper`} className="text-xs text-muted-foreground">
                {helperText}
              </p>}
            
            {/* Success indicator */}
            {showSuccess && !error && <p className="text-sm text-success flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span className="sr-only">Valid input</span>
              </p>}
          </div>
          
          {/* Character Counter */}
          {showCharacterCount && maxLength}
        </div>
      </div>;
});
EnhancedTextarea.displayName = "EnhancedTextarea";

// Keep original as default for backward compatibility
const Textarea = BaseTextarea;
export { Textarea, EnhancedTextarea, BaseTextarea };
