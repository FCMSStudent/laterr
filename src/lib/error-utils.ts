/**
 * Extracts a user-friendly error message from an error object
 * @param error - The error object
 * @param fallbackMessage - Default message if extraction fails
 * @returns A user-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage: string = "An unexpected error occurred"
): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle Supabase error format
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return fallbackMessage;
}

/**
 * Logs an error to the console with additional context
 * @param context - Context description (e.g., "fetching items", "saving changes")
 * @param error - The error object
 */
export function logError(context: string, error: unknown): void {
  console.error(`Error ${context}:`, error);
}

/**
 * Handles an error by logging it and returning a user-friendly message
 * @param context - Context description
 * @param error - The error object
 * @param fallbackMessage - Default message if extraction fails
 * @returns A user-friendly error message
 */
export function handleError(
  context: string,
  error: unknown,
  fallbackMessage?: string
): string {
  logError(context, error);
  return getErrorMessage(error, fallbackMessage);
}
