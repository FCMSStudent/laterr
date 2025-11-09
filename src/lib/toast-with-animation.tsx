import { toast as sonnerToast } from "sonner";
import { Check } from "lucide-react";

/**
 * Show a success toast with animated checkmark icon
 */
export function toastSuccess(message: string, options?: { description?: string }) {
  return sonnerToast.success(message, {
    ...options,
    icon: (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white animate-in zoom-in-50 duration-300">
        <Check className="h-3 w-3" strokeWidth={3} />
      </div>
    ),
  });
}

/**
 * Show an error toast with retry functionality if applicable
 */
export function toastError(
  message: string,
  options?: { 
    description?: string;
    onRetry?: () => void;
  }
) {
  return sonnerToast.error(message, {
    description: options?.description,
    action: options?.onRetry ? {
      label: "Retry",
      onClick: options.onRetry,
    } : undefined,
  });
}
