import { useCallback, MouseEvent } from "react";

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
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    // Create ripple element
    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.3;
      pointer-events: none;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      animation: ripple-effect 600ms ease-out;
      transform: scale(0);
    `;
    
    // Ensure parent has position relative
    if (getComputedStyle(button).position === 'static') {
      button.style.position = 'relative';
    }
    button.style.overflow = 'hidden';
    
    button.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }, []);
};
