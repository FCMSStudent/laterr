/**
 * Utility functions for managing onboarding state
 */

/**
 * Check if user has completed the onboarding flow
 * @returns true if onboarding is completed, false otherwise
 */
export const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem('onboardingCompleted') === 'true';
  } catch (error) {
    console.warn('Failed to read onboarding status from localStorage:', error);
    return false; // Default to showing onboarding if localStorage is unavailable
  }
};
