import { useState, useEffect } from 'react';

export type GlassIntensity = 'standard' | 'reduced' | 'minimal';

const STORAGE_KEY = 'glass-intensity-preference';

/**
 * Type guard to validate glass intensity values
 */
const isValidGlassIntensity = (value: string): value is GlassIntensity => {
  return value === 'standard' || value === 'reduced' || value === 'minimal';
};

/**
 * Hook to manage user preference for glassmorphism intensity
 * Allows users to reduce transparency and blur effects if needed
 */
export const useGlassIntensity = () => {
  const [intensity, setIntensityState] = useState<GlassIntensity>(() => {
    // Check localStorage for saved preference with error handling
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isValidGlassIntensity(saved)) {
        return saved;
      }
    } catch (error) {
      // localStorage not available (SSR, private browsing, etc.)
      console.warn('localStorage not available:', error);
    }
    return 'standard';
  });

  useEffect(() => {
    // Apply the intensity class to the document root
    document.documentElement.classList.remove('glass-reduced', 'glass-minimal');
    if (intensity === 'reduced') {
      document.documentElement.classList.add('glass-reduced');
    } else if (intensity === 'minimal') {
      document.documentElement.classList.add('glass-minimal');
    }
  }, [intensity]);

  const setIntensity = (newIntensity: GlassIntensity) => {
    setIntensityState(newIntensity);
    try {
      localStorage.setItem(STORAGE_KEY, newIntensity);
    } catch (error) {
      // localStorage not available (SSR, private browsing, etc.)
      console.warn('Failed to save glass intensity preference:', error);
    }
  };

  return { intensity, setIntensity };
};
