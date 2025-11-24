/**
 * Utility functions for retrying failed operations
 * Helps handle transient failures like network timeouts, rate limits, etc.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    
    // Retry on network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch failed')) {
      return true;
    }
    
    // Retry on temporary service errors
    if (message.includes('503') || message.includes('service unavailable')) {
      return true;
    }
    
    // Retry on connection errors
    if (message.includes('connection') || message.includes('econnrefused')) {
      return true;
    }
    
    // Don't retry on authentication errors
    if (message.includes('not authenticated') || message.includes('unauthorized') || message.includes('forbidden')) {
      return false;
    }
    
    // Don't retry on validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return false;
    }
    
    // Don't retry on rate limit errors (user should wait)
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return false;
    }
    
    return false;
  }
};

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${config.maxAttempts}`);
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!config.shouldRetry(error)) {
        console.log('Error is not retryable, failing immediately');
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt === config.maxAttempts) {
        console.log('Max attempts reached, failing');
        break;
      }
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
      await sleep(delay);
      
      // Exponential backoff with max delay cap
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  // All retries failed, throw the last error
  throw lastError;
}

/**
 * Retry options specifically for Supabase operations
 */
export const SUPABASE_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    
    // Retry on Supabase connection errors
    if (message.includes('connection') || message.includes('fetch failed')) {
      return true;
    }
    
    // Retry on timeout errors
    if (message.includes('timeout')) {
      return true;
    }
    
    // Don't retry on auth or validation errors
    return DEFAULT_OPTIONS.shouldRetry(error);
  }
};

/**
 * Retry options specifically for AI/embedding operations
 */
export const AI_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2, // AI calls are expensive, retry less
  initialDelay: 2000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    
    // Don't retry on rate limits (user should wait)
    if (message.includes('rate limit') || message.includes('429')) {
      return false;
    }
    
    // Don't retry on credits exhausted
    if (message.includes('credits') || message.includes('402')) {
      return false;
    }
    
    // Retry on temporary service errors
    if (message.includes('503') || message.includes('service unavailable')) {
      return true;
    }
    
    // Retry on network errors
    return DEFAULT_OPTIONS.shouldRetry(error);
  }
};
