import * as React from "react";
import { AlertCircle, Check, X, Info } from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// Base textarea component for backward compatibility
const BaseTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm",
          "ring-offset-white placeholder:text-gray-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          "transition-all duration-200 shadow-sm focus-visible:shadow-md",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
BaseTextarea.displayName = "BaseTextarea";

export interface EnhancedTextareaProps extends TextareaProps {
  // Character counter
  showCharacterCount?: boolean;
  characterCountThreshold?: number; // Show warning when this percentage is reached (default 0.9)

  // Validation
  error?: string;
  success?: boolean;
  warning?: string;

  // Label
  label?: string;
  helperText?: string;
  required?: boolean;

  // Auto-resize
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;

  // Clear button
  showClearButton?: boolean;
  onClear?: () => void;

  // Styling variants
  variant?: "default" | "filled" | "outlined" | "ghost";
  size?: "sm" | "md" | "lg";
}

const EnhancedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  EnhancedTextareaProps
>(
  (
    {
      className,
      showCharacterCount = true,
      characterCountThreshold = 0.9,
      maxLength,
      error,
      success,
      warning,
      label,
      helperText,
      required,
      value,
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      showClearButton = false,
      onClear,
      variant = "default",
      size = "md",
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = React.useState(
      typeof value === "string" ? value.length : 0
    );
    const [isFocused, setIsFocused] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Auto-resize functionality
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = "auto";
        
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const minHeight = lineHeight * minRows;
        const maxHeight = lineHeight * maxRows;
        
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
      }
    }, [value, autoResize, minRows, maxRows]);

    React.useEffect(() => {
      if (typeof value === "string") {
        setCharCount(value.length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      props.onChange?.(e);
    };

    const handleClear = () => {
      setCharCount(0);
      onClear?.();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };

    const showError = !!error;
    const showWarning = !!warning && !error;
    const showSuccess = success && !error && !warning && charCount > 0;
    const isNearLimit = maxLength && charCount > maxLength * characterCountThreshold;
    const isAtLimit = maxLength && charCount >= maxLength;
    const remaining = maxLength ? maxLength - charCount : null;

    // Size classes
    const sizeClasses = {
      sm: "px-3 py-2 text-xs min-h-[60px]",
      md: "px-4 py-3 text-sm min-h-[80px]",
      lg: "px-5 py-4 text-base min-h-[100px]",
    };

    // Variant classes
    const variantClasses = {
      default: "border bg-white",
      filled: "border-transparent bg-gray-100 focus-visible:bg-white",
      outlined: "border-2 bg-transparent",
      ghost: "border-transparent bg-transparent hover:bg-gray-50",
    };

    const textareaClasses = cn(
      "flex w-full rounded-lg ring-offset-white placeholder:text-gray-400",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
      "transition-all duration-200",
      autoResize ? "resize-none" : "resize-y",
      sizeClasses[size],
      variantClasses[variant],
      showError &&
        "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
      showWarning &&
        "border-amber-500 focus-visible:ring-amber-500 focus-visible:border-amber-500",
      showSuccess &&
        "border-green-500 focus-visible:ring-green-500 focus-visible:border-green-500",
      !showError &&
        !showWarning &&
        !showSuccess &&
        "border-gray-300 focus-visible:ring-blue-500 focus-visible:border-blue-500",
      isFocused && "shadow-md",
      className
    );

    return (
      <div className="w-full space-y-2">
        {/* Label */}
        {label && (
          <label
            htmlFor={props.id}
            className={cn(
              "text-sm font-medium leading-none inline-flex items-center gap-1",
              showError && "text-red-600",
              showWarning && "text-amber-600",
              showSuccess && "text-green-600"
            )}
          >
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}

        {/* Textarea Container */}
        <div className="relative">
          <textarea
            ref={(node) => {
              textareaRef.current = node;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            className={textareaClasses}
            value={value}
            maxLength={maxLength}
            onChange={handleChange}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            aria-invalid={showError}
            aria-describedby={
              error
                ? `${props.id}-error`
                : helperText
                ? `${props.id}-helper`
                : undefined
            }
            {...props}
          />

          {/* Clear Button */}
          {showClearButton && charCount > 0 && !props.disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "absolute right-3 top-3 p-1 rounded-md",
                "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              )}
              aria-label="Clear text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Footer: Helper text, messages, and character counter */}
        <div className="flex justify-between items-start gap-2 min-h-[20px]">
          <div className="flex-1 space-y-1">
            {/* Error Message */}
            {error && (
              <p
                id={`${props.id}-error`}
                className="text-sm text-red-600 flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}

            {/* Warning Message */}
            {showWarning && (
              <p
                className="text-sm text-amber-600 flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </p>
            )}

            {/* Helper Text */}
            {!error && !warning && helperText && (
              <p
                id={`${props.id}-helper`}
                className="text-xs text-gray-500"
              >
                {helperText}
              </p>
            )}

            {/* Success indicator */}
            {showSuccess && !error && !warning && (
              <p className="text-sm text-green-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Check className="h-4 w-4" />
                <span>Looks good!</span>
              </p>
            )}
          </div>

          {/* Character Counter */}
          {showCharacterCount && maxLength && (
            <div
              className={cn(
                "text-xs font-medium tabular-nums transition-colors duration-200",
                isAtLimit && "text-red-600 font-semibold",
                isNearLimit && !isAtLimit && "text-amber-600",
                !isNearLimit && "text-gray-500"
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className={cn(isAtLimit && "animate-pulse")}>
                {charCount}
              </span>
              <span className="text-gray-400 mx-0.5">/</span>
              {maxLength}
              {remaining !== null && remaining < 50 && remaining > 0 && (
                <span className="ml-1 text-[10px]">
                  ({remaining} left)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);
EnhancedTextarea.displayName = "EnhancedTextarea";

// Keep original as default for backward compatibility
const Textarea = BaseTextarea;

// Demo Component
export default function TextareaDemo() {
  const [value1, setValue1] = React.useState("");
  const [value2, setValue2] = React.useState("This is an auto-resizing textarea that grows as you type more content. Try adding multiple lines!");
  const [value3, setValue3] = React.useState("");
  const [value4, setValue4] = React.useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            God-Tier Textarea Component
          </h1>
          <p className="text-gray-600">
            Feature-rich, accessible, and beautifully animated
          </p>
        </div>

        <div className="grid gap-8">
          {/* Standard with all features */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Standard Enhanced Textarea
            </h2>
            <EnhancedTextarea
              id="textarea1"
              label="Your Message"
              placeholder="Type your message here..."
              helperText="Share your thoughts with us"
              value={value1}
              onChange={(e) => setValue1(e.target.value)}
              maxLength={200}
              showCharacterCount
              showClearButton
              onClear={() => setValue1("")}
              required
            />
          </div>

          {/* Auto-resize variant */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Auto-Resizing Textarea
            </h2>
            <EnhancedTextarea
              id="textarea2"
              label="Auto-Growing Content"
              placeholder="This textarea grows automatically..."
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              autoResize
              minRows={2}
              maxRows={8}
              variant="filled"
              showClearButton
              onClear={() => setValue2("")}
            />
          </div>

          {/* With validation states */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Validation States
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <EnhancedTextarea
                id="textarea3"
                label="Error State"
                placeholder="Enter invalid text..."
                value={value3}
                onChange={(e) => setValue3(e.target.value)}
                error={value3 && value3.length < 10 ? "Must be at least 10 characters" : undefined}
                maxLength={100}
                size="sm"
              />
              <EnhancedTextarea
                id="textarea4"
                label="Success State"
                placeholder="Enter valid text..."
                value={value4}
                onChange={(e) => setValue4(e.target.value)}
                success={value4.length >= 10}
                maxLength={100}
                size="sm"
              />
            </div>
          </div>

          {/* Different variants */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Style Variants
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <EnhancedTextarea
                placeholder="Outlined variant..."
                variant="outlined"
                size="md"
              />
              <EnhancedTextarea
                placeholder="Ghost variant..."
                variant="ghost"
                size="md"
              />
            </div>
          </div>

          {/* Size variants */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Size Variants
            </h2>
            <div className="space-y-4">
              <EnhancedTextarea
                placeholder="Small size..."
                size="sm"
                showCharacterCount={false}
              />
              <EnhancedTextarea
                placeholder="Medium size (default)..."
                size="md"
                showCharacterCount={false}
              />
              <EnhancedTextarea
                placeholder="Large size..."
                size="lg"
                showCharacterCount={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
