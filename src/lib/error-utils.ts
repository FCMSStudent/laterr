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
  if (errorMsg.includes('not authenticated') || errorMsg.includes('authentication failed')) {
    return {
      title: 'Authentication Required',
      description: 'Please sign in to add items to your collection.',
      logDetails: 'Authentication check failed. User may not be logged in or session may have expired.'
    };
  }
  
  // Check for missing API configuration
  if (errorMsg.includes('missing authorization') || errorMsg.includes('api key') || errorMsg.includes('is not configured')) {
    return {
      title: 'Configuration Error',
      description: 'API configuration is missing or invalid. Please check the console for details.',
      logDetails: 'API configuration issue detected. Please verify:\n' +
        '  1. VITE_SUPABASE_URL is set in .env\n' +
        '  2. VITE_SUPABASE_PUBLISHABLE_KEY is set in .env\n' +
        '  3. LOVABLE_API_KEY is configured in Supabase Edge Functions\n' +
        '  4. Restart development server after updating .env'
    };
  }
  
  // Check for database permission issues
  if (errorMsg.includes('permission') || errorMsg.includes('policy') || errorMsg.includes('rls')) {
    return {
      title: 'Permission Error',
      description: 'You do not have permission to add items. Please check your authentication status.',
      logDetails: 'Database permission denied. This could be due to Row Level Security (RLS) policies.'
    };
  }
  
  // Check for function invocation errors
  if (errorMsg.includes('function') && (errorMsg.includes('not found') || errorMsg.includes('unavailable'))) {
    return {
      title: 'Service Error',
      description: 'The required service is unavailable. Please contact support.',
      logDetails: 'Edge function not found or not deployed. Check Supabase project status.'
    };
  }
  
  // Check for network/timeout errors
  if (errorMsg.includes('timeout') || errorMsg.includes('network') || errorMsg.includes('fetch failed')) {
    return {
      title: 'Network Error',
      description: 'Connection problem. Please check your internet connection and try again.',
      logDetails: 'Network request failed or timed out. Check internet connectivity and Supabase project status.'
    };
  }
  
  // Check for CORS errors
  if (errorMsg.includes('cors') || errorMsg.includes('cross-origin')) {
    return {
      title: 'Configuration Error',
      description: 'Cross-origin request blocked. Please contact support.',
      logDetails: 'CORS error detected. Edge function CORS headers may not be configured correctly.'
    };
  }
  
  // Check for database insert errors
  if (errorMsg.includes('null value') || errorMsg.includes('violates not-null constraint')) {
    return {
      title: 'Data Validation Error',
      description: 'Some required data is missing. Please try again.',
      logDetails: 'Database constraint violation. Required field may be null. Error: ' + error.message
    };
  }
  
  // Check for URL analysis failure
  if (errorMsg.includes('url analysis returned no data') || errorMsg.includes('invalid url')) {
    return {
      title: 'URL Analysis Failed',
      description: 'Unable to analyze this URL. It may be blocked or unavailable.',
      logDetails: 'URL analysis returned no data. URL may be inaccessible or blocked by the site.'
    };
  }
  
  // Check for file analysis failure
  if (errorMsg.includes('file analysis returned no data')) {
    return {
      title: 'File Analysis Failed',
      description: 'Unable to analyze this file. It may be corrupted or in an unsupported format.',
      logDetails: 'File analysis returned no data. File may be corrupted or unsupported format.'
    };
  }
  
  return null;
}
