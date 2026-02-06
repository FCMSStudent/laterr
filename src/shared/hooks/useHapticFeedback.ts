/**
 * Hook for providing haptic feedback on mobile devices
 * Uses the Vibration API when available
 */
export const useHapticFeedback = () => {
  const trigger = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    // Check if the Vibration API is supported
    if (!('vibrate' in navigator)) {
      return;
    }

    // Different vibration patterns for different feedback types
    const patterns: Record<typeof type, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      selection: [5, 50, 5]
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Silently fail if vibration is not supported or throws an error
      console.debug('Haptic feedback not available:', error);
    }
  };

  return { trigger };
};
