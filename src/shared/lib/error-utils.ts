import { AUTH_ERRORS, ITEM_ERRORS, NETWORK_ERRORS } from './error-messages';

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

export type EdgeFunctionErrorDetails = {
  status?: number;
  code?: string;
  message?: string;
  requestId?: string;
};

const REQUEST_ID_HEADERS = ['x-request-id', 'x-supabase-request-id'];

function getRequestId(response?: Response | null): string | undefined {
  if (!response || !('headers' in response)) return undefined;
  for (const header of REQUEST_ID_HEADERS) {
    const value = response.headers.get(header);
    if (value) return value;
  }
  return undefined;
}

/**
 * Robustly extracts error details from various Supabase Edge Function error shapes.
 * Handles Response objects (async json parsing), standard Error objects, and plain objects.
 */
export async function getEdgeFunctionErrorDetails(
  error: unknown,
  fallbackStatus?: number
): Promise<EdgeFunctionErrorDetails> {
  let status: number | undefined = fallbackStatus;
  let code: string | undefined;
  let message: string | undefined;
  let requestId: string | undefined;

  if (typeof error === 'object' && error !== null) {
    const err = error as any;

    // Handle Supabase FunctionsHttpError shape (often has a 'context' property)
    const context = err.context;

    if (context) {
      // 1. Try treating context as a Response object
      if (typeof context.clone === 'function' && typeof context.json === 'function') {
        try {
          // We clone the response to avoid consuming the body if it's needed elsewhere
          // although properly we should probably consume it here.
          const clone = context.clone();
          const data = await clone.json();

          if (data?.error) {
            code = data.error.code;
            message = data.error.message;
            requestId = data.error.requestId || data.error.request_id;
          } else {
            // Sometimes error is the body itself or flattened
            code = data?.code;
            message = data?.message || data?.error;
            requestId = data?.requestId || data?.request_id;
          }

          status = context.status;
          requestId = requestId || getRequestId(context);
        } catch (e) {
          // JSON parsing failed, maybe it's not JSON
        }
      }
      // 2. Try treating context as a plain object (pre-parsed or different shape)
      else if (typeof context === 'object') {
        status = context.status ?? status;

        // Check for nested body/json properties which AddItemModal handled
        const body = context.body || context.json;
        if (body) {
          const errBody = body.error || body; // sometimes error is nested
          code = errBody?.code ?? code;
          message = errBody?.message ?? errBody?.error ?? message;
          requestId = errBody?.requestId ?? errBody?.request_id ?? requestId;
        }
      }
    }
    // Handle direct Response object passed as error (HealthChatPanel case)
    else if (typeof (err as any).json === 'function') {
      try {
        const clone = (err as Response).clone();
        const data = await clone.json();
        if (data?.error) {
          code = data.error.code;
          message = data.error.message;
        } else {
          code = data?.code;
          message = data?.message || data?.error;
        }
        status = err.status;
        requestId = getRequestId(err);
      } catch (e) { }
    }

    // 3. Fallback to top-level properties if not found yet
    if (status === undefined) status = err.status;
    if (!code) code = err.code || err.error_code;
    if (!message) message = err.message || err.error_description;
    if (!requestId) requestId = err.requestId || err.request_id;
  }

  return { status, code, message, requestId };
}

/**
 * Maps edge function error details to a user-friendly ToastMessage.
 * Centralizes all error mapping logic.
 */
export function getToastForEdgeFunctionError(
  details: EdgeFunctionErrorDetails,
  defaultMessage: ToastMessage = DEFAULT_TOAST_MESSAGE
): ToastMessage {
  const { status } = details;
  const code = details.code?.toLowerCase();

  // 1. Authentication & Permissions
  if (status === 401 || code === 'unauthorized' || code === 'jwt_expired') {
    return {
      title: 'Authentication Required',
      description: 'Please sign in again to continue.'
    };
  }

  if (status === 403 || code === 'forbidden') {
    return {
      title: 'Access Denied',
      description: 'You do not have permission to perform this action.'
    };
  }

  // 2. Rate Limiting & Quotas (AI specific)
  if (status === 429 || code === 'rate_limit' || code === 'too_many_requests') {
    return ITEM_ERRORS.AI_RATE_LIMIT ? {
      title: ITEM_ERRORS.AI_RATE_LIMIT.title,
      description: ITEM_ERRORS.AI_RATE_LIMIT.message
    } : {
      title: 'Too Many Requests',
      description: 'Please wait a moment and try again.'
    };
  }

  if (status === 402 || code === 'credits_exhausted' || code === 'payment_required' || code === 'insufficient_quota') {
    return ITEM_ERRORS.AI_CREDITS_EXHAUSTED ? {
      title: ITEM_ERRORS.AI_CREDITS_EXHAUSTED.title,
      description: ITEM_ERRORS.AI_CREDITS_EXHAUSTED.message
    } : {
      title: 'AI Credits Exhausted',
      description: 'You have run out of credits. Please upgrade to continue.'
    };
  }

  // 3. Request Issues
  if (status === 400 || code === 'bad_request' || code === 'invalid_input') {
    return {
      title: 'Invalid Request',
      description: 'We couldn’t process that request. Please try again.'
    };
  }

  if (status === 413 || code === 'payload_too_large') {
    return ITEM_ERRORS.FILE_TOO_LARGE ? {
      title: ITEM_ERRORS.FILE_TOO_LARGE.title,
      description: ITEM_ERRORS.FILE_TOO_LARGE.message
    } : {
      title: 'File Too Large',
      description: 'The file is too large to process.'
    };
  }

  // 4. Server/Timeout Issues
  if (status === 408 || status === 504 || code === 'timeout') {
    return NETWORK_ERRORS.CONNECTION_TIMEOUT ? {
      title: NETWORK_ERRORS.CONNECTION_TIMEOUT.title,
      description: NETWORK_ERRORS.CONNECTION_TIMEOUT.message
    } : {
      title: 'Request Timeout',
      description: 'The operation took too long. Please try again.'
    };
  }

  if (status && status >= 500) {
    return {
      title: 'Service Unavailable',
      description: 'Our services are experiencing issues. Please try again later.'
    };
  }

  // 5. Context Specific (using code)
  if (code?.includes('invalid_url')) {
    return ITEM_ERRORS.URL_INVALID ? {
      title: ITEM_ERRORS.URL_INVALID.title,
      description: ITEM_ERRORS.URL_INVALID.message
    } : defaultMessage;
  }

  if (code?.includes('file_type') || code?.includes('unsupported_media')) {
    return ITEM_ERRORS.FILE_INVALID_TYPE ? {
      title: ITEM_ERRORS.FILE_INVALID_TYPE.title,
      description: ITEM_ERRORS.FILE_INVALID_TYPE.message
    } : defaultMessage;
  }

  return defaultMessage;
}

// Deprecated functions (kept for compatibility during migration if needed, but we are refactoring all usages)
// We will simply remove them or alias them if strictly compatible.
// getToastMessageFromErrorDetails and getToastMessageFromSupabaseError were doing similar things but less robustly.
// For clean refactor, I will remove the specific exports if they are not used elsewhere.
// But better to leave them as aliases for now or just replace them.
// Given strict instructions to avoid breakage, I'll remove them as I am updating all call sites.

