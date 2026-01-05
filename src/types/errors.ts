/**
 * Custom error types for better error handling across the application
 */

/**
 * AuthError - Represents authentication and authorization errors
 * Used for login, signup, and session-related failures
 */
export class AuthError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'AuthError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

/**
 * NetworkError - Represents network and API communication errors
 * Used for Supabase function calls, database operations, and external API failures
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'NetworkError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * ValidationError - Represents input validation errors
 * Used for form validation and data integrity checks
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Type guard to check if an error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Type guard to check if an error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Converts unknown errors to typed errors
 * This is useful for catch blocks where the error type is unknown
 */
export function toTypedError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('An unknown error occurred');
}
