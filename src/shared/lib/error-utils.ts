/**
 * Error handling utilities for consistent error formatting across the application
 */

/**
 * Formats an error into a user-friendly message
 * @param error - The error object or unknown value
 * @param fallbackMessage - The message to use if error message cannot be extracted
 * @returns A formatted error message string
 */
export function formatError(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

/**
 * Handles Supabase-specific errors with custom logic
 * @param error - The error object
 * @param fallbackMessage - The message to use if error message cannot be extracted
 * @returns An object containing the formatted message and optional metadata
 * 
 * Note: Error detection uses string matching as Supabase doesn't provide specific error codes
 * for rate limits and credits. This may need updates if error message formats change.
 */
export function handleSupabaseError(
  error: unknown,
  fallbackMessage: string
): { message: string; isRateLimitError: boolean; isCreditsError: boolean } {
  const message = formatError(error, fallbackMessage);
  // String matching is used as Supabase doesn't expose specific error codes for these cases
  const isRateLimitError = error instanceof Error && error.message.includes('Rate limit');
  const isCreditsError = error instanceof Error && error.message.includes('credits');

  return {
    message,
    isRateLimitError,
    isCreditsError,
  };
}

/**
 * Checks for common configuration and authentication errors
 * @param error - The error object to check
 * @returns Object with error type and user-friendly message, or null if not a common error
 */
export function checkCommonConfigErrors(error: unknown): { 
  title: string; 
  description: string;
  logDetails?: string;
} | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const errorMsg = error.message.toLowerCase();
  
  // Check for authentication issues
  if (errorMsg.includes('not authenticated') || errorMsg.includes('auth')) {
    return {
      title: 'Authentication Required',
      description: 'Please sign in to add items to your collection.'
    };
  }
  
  // Check for missing API configuration
  if (errorMsg.includes('missing authorization') || errorMsg.includes('api key')) {
    return {
      title: 'Configuration Error',
      description: 'API configuration is missing or invalid. Please check the console for details.',
      logDetails: 'API configuration issue detected. Please verify:\n' +
        '  1. VITE_SUPABASE_URL is set in .env\n' +
        '  2. VITE_SUPABASE_PUBLISHABLE_KEY is set in .env\n' +
        '  3. LOVABLE_API_KEY is configured in Supabase Edge Functions'
    };
  }
  
  // Check for database permission issues
  if (errorMsg.includes('permission') || errorMsg.includes('policy')) {
    return {
      title: 'Permission Error',
      description: 'You do not have permission to add items. Please check your authentication status.'
    };
  }
  
  // Check for function invocation errors
  if (errorMsg.includes('function') && errorMsg.includes('not found')) {
    return {
      title: 'Service Error',
      description: 'The required service is unavailable. Please contact support.'
    };
  }
  
  return null;
}

export type ToastErrorInput = {
  status?: number | null;
  code?: string | null;
  message?: string | null;
  requestId?: string | null;
};

export type ToastMessage = {
  title: string;
  description: string;
};

const DEFAULT_TOAST_MESSAGE: ToastMessage = {
  title: 'Unexpected error',
  description: 'Please try again soon.',
};

const TOAST_MESSAGES_BY_STATUS: Record<number, ToastMessage> = {
  400: {
    title: 'Invalid request',
    description: 'Please check your input and try again.',
  },
  401: {
    title: 'Sign in required',
    description: 'Please sign in to continue.',
  },
  402: {
    title: 'AI credits exhausted',
    description: 'You’ve run out of AI credits. Please upgrade or try later.',
  },
  403: {
    title: 'Access denied',
    description: 'You don’t have permission to do that.',
  },
  429: {
    title: 'Too many requests',
    description: 'Please wait a moment and try again.',
  },
  500: {
    title: 'Something went wrong',
    description: 'Please try again soon.',
  },
};

/**
 * Returns a safe, user-facing toast message for an error status.
 * Raw error details should only be used in logs, not in toasts.
 */
export function getToastMessageFromErrorDetails({
  status,
}: ToastErrorInput): ToastMessage {
  if (!status) {
    return DEFAULT_TOAST_MESSAGE;
  }

  return TOAST_MESSAGES_BY_STATUS[status] ?? DEFAULT_TOAST_MESSAGE;
}

type SupabaseFunctionsHttpError = {
  status?: number;
  context?: {
    json?: {
      error?: ToastErrorInput;
    };
  };
};

/**
 * Parses Supabase FunctionsHttpError details for a safe toast message.
 * Uses structured JSON in error.context?.json?.error and the HTTP status.
 */
export function getToastMessageFromSupabaseError(error: unknown): ToastMessage {
  if (!error || typeof error !== 'object') {
    return DEFAULT_TOAST_MESSAGE;
  }

  const supabaseError = error as SupabaseFunctionsHttpError;
  const contextError = supabaseError.context?.json?.error;

  return getToastMessageFromErrorDetails({
    status: contextError?.status ?? supabaseError.status,
    code: contextError?.code,
    message: contextError?.message,
    requestId: contextError?.requestId,
  });
}
