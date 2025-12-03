/**
 * User-friendly, actionable error messages for the application
 * This module provides clear, helpful error messages instead of generic errors
 */

/**
 * Authentication error messages with actionable guidance
 */
export const AUTH_ERRORS = {
  INVALID_EMAIL: {
    title: 'Invalid Email',
    message: 'Please enter a valid email address (e.g., user@example.com)',
  },
  INVALID_PASSWORD: {
    title: 'Invalid Password',
    message: 'Password must be at least 6 characters long',
  },
  INVALID_CREDENTIALS: {
    title: 'Sign In Failed',
    message: 'The email or password you entered is incorrect. Please try again.',
  },
  USER_NOT_FOUND: {
    title: 'Account Not Found',
    message: 'No account exists with this email. Would you like to sign up instead?',
  },
  EMAIL_ALREADY_EXISTS: {
    title: 'Email Already in Use',
    message: 'An account with this email already exists. Try signing in instead.',
  },
  WEAK_PASSWORD: {
    title: 'Password Too Weak',
    message: 'Please create a stronger password with at least 6 characters.',
  },
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
  },
  SESSION_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again to continue.',
  },
  SIGN_OUT_FAILED: {
    title: 'Sign Out Failed',
    message: 'Unable to sign out. Please try closing your browser or clearing your cache.',
  },
  GENERIC: {
    title: 'Authentication Error',
    message: 'Something went wrong during authentication. Please try again in a few moments.',
  },
} as const;

/**
 * Database and network error messages with helpful context
 */
export const NETWORK_ERRORS = {
  FETCH_ITEMS_FAILED: {
    title: 'Failed to Load Items',
    message: 'Unable to load your items. Please refresh the page or try again later.',
  },
  SAVE_FAILED: {
    title: 'Save Failed',
    message: 'Unable to save your changes. Please check your connection and try again.',
  },
  DELETE_FAILED: {
    title: 'Delete Failed',
    message: 'Unable to delete this item. Please try again or contact support if the problem persists.',
  },
  UPLOAD_FAILED: {
    title: 'Upload Failed',
    message: 'Unable to upload the file. Please check your connection and try again.',
  },
  CONNECTION_TIMEOUT: {
    title: 'Request Timeout',
    message: 'The request took too long. Please check your connection and try again.',
  },
  GENERIC: {
    title: 'Network Error',
    message: 'A network error occurred. Please check your connection and try again.',
  },
} as const;

/**
 * Item creation error messages with specific guidance
 */
export const ITEM_ERRORS = {
  URL_INVALID: {
    title: 'Invalid URL',
    message: 'Please enter a valid URL starting with http:// or https://',
  },
  URL_TOO_LONG: {
    title: 'URL Too Long',
    message: 'The URL you entered is too long. Please use a URL shortener or try a different link.',
  },
  URL_ANALYSIS_FAILED: {
    title: 'Unable to Analyze URL',
    message: 'We couldn\'t analyze this URL. It may be blocked or unavailable. Try adding it as a note instead.',
  },
  NOTE_EMPTY: {
    title: 'Note is Empty',
    message: 'Please write something before saving your note.',
  },
  NOTE_TOO_LONG: {
    title: 'Note Too Long',
    message: 'Your note exceeds the maximum length. Please shorten it and try again.',
  },
  FILE_NOT_SELECTED: {
    title: 'No File Selected',
    message: 'Please select a file to upload.',
  },
  FILE_INVALID_TYPE: {
    title: 'Invalid File Type',
    message: 'Only images (JPG, PNG, GIF, WebP), PDFs, and Word documents are supported.',
  },
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'The file size exceeds 20MB. Please compress or choose a smaller file.',
  },
  FILE_UPLOAD_FAILED: {
    title: 'Upload Failed',
    message: 'Unable to upload your file. Please check the file and your connection, then try again.',
  },
  FILE_ANALYSIS_FAILED: {
    title: 'Analysis Failed',
    message: 'Unable to analyze this file. It may be corrupted or in an unsupported format.',
  },
  PDF_LOAD_FAILED: {
    title: 'File Load Failed',
    message: 'Unable to load file preview. The file may be unavailable.',
  },
  AI_RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests. Please wait a moment and try again.',
  },
  AI_CREDITS_EXHAUSTED: {
    title: 'AI Credits Exhausted',
    message: 'You\'ve run out of AI analysis credits. Please upgrade your account or try again later.',
  },
  ADD_FAILED: {
    title: 'Failed to Add Item',
    message: 'Unable to add this item to your collection. Please try again.',
  },
} as const;

/**
 * Update operation error messages
 */
export const UPDATE_ERRORS = {
  NOTES_TOO_LONG: {
    title: 'Notes Too Long',
    message: 'Your notes exceed the maximum length of 100,000 characters. Please shorten them.',
  },
  UPDATE_FAILED: {
    title: 'Update Failed',
    message: 'Unable to save your changes. Please try again or refresh the page.',
  },
  ITEM_NOT_FOUND: {
    title: 'Item Not Found',
    message: 'This item no longer exists. It may have been deleted.',
  },
} as const;

/**
 * Helper function to get authentication error message based on Supabase error
 */
export function getAuthErrorMessage(error: unknown): { title: string; message: string } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Check for specific Supabase auth error patterns
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return AUTH_ERRORS.INVALID_CREDENTIALS;
    }
    if (message.includes('user not found')) {
      return AUTH_ERRORS.USER_NOT_FOUND;
    }
    if (message.includes('email already') || message.includes('already registered')) {
      return AUTH_ERRORS.EMAIL_ALREADY_EXISTS;
    }
    if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
      return AUTH_ERRORS.WEAK_PASSWORD;
    }
    if (message.includes('network') || message.includes('fetch failed') || message.includes('connection')) {
      return AUTH_ERRORS.NETWORK_ERROR;
    }
    if (message.includes('session') || message.includes('expired') || message.includes('jwt')) {
      return AUTH_ERRORS.SESSION_EXPIRED;
    }
  }
  
  return AUTH_ERRORS.GENERIC;
}

/**
 * Helper function to get network error message
 */
export function getNetworkErrorMessage(context: 'fetch' | 'save' | 'delete' | 'upload' | 'generic' = 'generic'): { title: string; message: string } {
  switch (context) {
    case 'fetch':
      return NETWORK_ERRORS.FETCH_ITEMS_FAILED;
    case 'save':
      return NETWORK_ERRORS.SAVE_FAILED;
    case 'delete':
      return NETWORK_ERRORS.DELETE_FAILED;
    case 'upload':
      return NETWORK_ERRORS.UPLOAD_FAILED;
    default:
      return NETWORK_ERRORS.GENERIC;
  }
}

/**
 * Helper function to get item creation error message
 */
export function getItemErrorMessage(error: unknown, context: 'url' | 'note' | 'file'): { title: string; message: string } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // AI and rate limiting errors
    if (message.includes('rate limit')) {
      return ITEM_ERRORS.AI_RATE_LIMIT;
    }
    if (message.includes('credits') || message.includes('quota')) {
      return ITEM_ERRORS.AI_CREDITS_EXHAUSTED;
    }
    
    // Context-specific errors
    if (context === 'url') {
      if (message.includes('invalid url') || message.includes('malformed')) {
        return ITEM_ERRORS.URL_INVALID;
      }
      if (message.includes('too long')) {
        return ITEM_ERRORS.URL_TOO_LONG;
      }
      if (message.includes('analysis') || message.includes('analyze')) {
        return ITEM_ERRORS.URL_ANALYSIS_FAILED;
      }
    }
    
    if (context === 'file') {
      if (message.includes('file type') || message.includes('mime')) {
        return ITEM_ERRORS.FILE_INVALID_TYPE;
      }
      if (message.includes('too large') || message.includes('size')) {
        return ITEM_ERRORS.FILE_TOO_LARGE;
      }
      if (message.includes('upload')) {
        return ITEM_ERRORS.FILE_UPLOAD_FAILED;
      }
      if (message.includes('analysis') || message.includes('analyze')) {
        return ITEM_ERRORS.FILE_ANALYSIS_FAILED;
      }
    }
    
    if (context === 'note') {
      if (message.includes('empty')) {
        return ITEM_ERRORS.NOTE_EMPTY;
      }
      if (message.includes('too long')) {
        return ITEM_ERRORS.NOTE_TOO_LONG;
      }
    }
  }
  
  return ITEM_ERRORS.ADD_FAILED;
}

/**
 * Helper function to get update operation error message
 */
export function getUpdateErrorMessage(error: unknown): { title: string; message: string } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('too long') || message.includes('exceeds')) {
      return UPDATE_ERRORS.NOTES_TOO_LONG;
    }
    if (message.includes('not found')) {
      return UPDATE_ERRORS.ITEM_NOT_FOUND;
    }
  }
  
  return UPDATE_ERRORS.UPDATE_FAILED;
}
