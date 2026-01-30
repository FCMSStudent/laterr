import { useCallback, MouseEvent } from "react";

// Animation duration in milliseconds - should match CSS animation
const RIPPLE_DURATION = 450;

/**
 * Hook to create Material-style ripple effect on elements
 * 
 * Usage:
 * ```tsx
 * const handleRipple = useRipple();
 * <button onClick={(e) => { handleRipple(e); yourHandler(); }}>Click me</button>
 * ```
 */
export const useRipple = () => {
  return useCallback((event: MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Calculate ripple position
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    // Create ripple element
    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.15;
      pointer-events: none;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      transform: scale(0);
      animation: ripple-effect ${RIPPLE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    `;
    
    // Ensure parent has required styles for positioning
    const computedStyle = getComputedStyle(button);
    if (computedStyle.position === 'static') {
      button.style.position = 'relative';
    }
    if (computedStyle.overflow === 'visible') {
      button.style.overflow = 'hidden';
    }
    
    button.appendChild(ripple);
    
    // Remove ripple after animation completes
    setTimeout(() => {
      ripple.remove();
    }, RIPPLE_DURATION);
  }, []);
};
