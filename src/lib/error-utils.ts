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
