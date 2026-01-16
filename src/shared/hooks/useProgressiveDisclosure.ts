import { useState, useCallback, useEffect } from 'react';

interface UseProgressiveDisclosureOptions {
  /**
   * Storage key for persisting state in localStorage
   */
  storageKey?: string;
  /**
   * Default expanded state if no persisted value exists
   */
  defaultExpanded?: boolean;
}

interface UseProgressiveDisclosureReturn {
  /**
   * Current expanded state
   */
  expanded: boolean;
  /**
   * Toggle expanded state
   */
  toggle: () => void;
  /**
   * Set expanded state explicitly
   */
  setExpanded: (value: boolean) => void;
}

/**
 * Hook for managing progressive disclosure UI patterns with optional localStorage persistence
 * 
 * @param options - Configuration options
 * @returns Object with expanded state and control functions
 * 
 * @example
 * ```tsx
 * const { expanded, toggle } = useProgressiveDisclosure({
 *   storageKey: 'filters-expanded',
 *   defaultExpanded: false
 * });
 * 
 * return (
 *   <div>
 *     <button onClick={toggle}>Toggle</button>
 *     {expanded && <div>Content</div>}
 *   </div>
 * );
 * ```
 */
export const useProgressiveDisclosure = ({
  storageKey,
  defaultExpanded = false,
}: UseProgressiveDisclosureOptions = {}): UseProgressiveDisclosureReturn => {
  // Initialize state from localStorage if storageKey provided
  const [expanded, setExpandedState] = useState<boolean>(() => {
    if (!storageKey) return defaultExpanded;
    
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? JSON.parse(stored) : defaultExpanded;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultExpanded;
    }
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    if (!storageKey) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [expanded, storageKey]);

  const toggle = useCallback(() => {
    setExpandedState(prev => !prev);
  }, []);

  const setExpanded = useCallback((value: boolean) => {
    setExpandedState(value);
  }, []);

  return {
    expanded,
    toggle,
    setExpanded,
  };
};
