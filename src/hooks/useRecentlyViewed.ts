import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recently-viewed-items';
const MAX_RECENT = 5;

export const useRecentlyViewed = () => {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading recently viewed:', e);
    }
  }, []);

  // Track a viewed item
  const trackViewed = useCallback((itemId: string) => {
    setRecentIds(prev => {
      const updated = [itemId, ...prev.filter(id => id !== itemId)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving recently viewed:', e);
      }
      return updated;
    });
  }, []);

  // Clear recently viewed
  const clearRecentlyViewed = useCallback(() => {
    setRecentIds([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing recently viewed:', e);
    }
  }, []);

  return { recentIds, trackViewed, clearRecentlyViewed };
};
