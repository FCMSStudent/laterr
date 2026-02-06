import { useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useHapticFeedback } from "@/shared/hooks/useHapticFeedback";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number;
}

export const PullToRefresh = ({ 
  onRefresh, 
  children, 
  disabled = false,
  threshold = 80 
}: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hapticTriggeredRef = useRef(false);
  const { trigger } = useHapticFeedback();

  const canPull = useCallback(() => {
    if (disabled || isRefreshing) return false;
    
    // Only allow pull when at the top of the page
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
    return scrollTop === 0;
  }, [disabled, isRefreshing]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canPull()) return;
    setStartY(e.touches[0].clientY);
    hapticTriggeredRef.current = false; // Reset haptic trigger flag
  }, [canPull]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canPull() || startY === 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0) {
      // Apply resistance to the pull
      const resistance = 2.5;
      const adjustedDistance = Math.min(distance / resistance, threshold * 1.5);
      setPullDistance(adjustedDistance);

      // Trigger haptic feedback at threshold (only once per pull)
      if (adjustedDistance >= threshold && !hapticTriggeredRef.current) {
        trigger('medium');
        hapticTriggeredRef.current = true;
      }

      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [canPull, startY, threshold, trigger]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      trigger('heavy');
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setStartY(0);
        hapticTriggeredRef.current = false;
      }
    } else {
      setPullDistance(0);
      setStartY(0);
      hapticTriggeredRef.current = false;
    }
  }, [pullDistance, threshold, isRefreshing, trigger, onRefresh]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isActivated = pullDistance >= threshold;
  const pullPercentage = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50",
          "pointer-events-none"
        )}
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
        }}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
            "bg-background/80 backdrop-blur-sm border border-border shadow-lg",
            isActivated && "scale-110"
          )}
        >
          <Loader2
            className={cn(
              "w-4 h-4 transition-all duration-200",
              isRefreshing && "animate-spin",
              isActivated ? "text-primary" : "text-muted-foreground"
            )}
            style={{
              transform: !isRefreshing ? `rotate(${pullPercentage * 3.6}deg)` : undefined,
            }}
          />
          <span className={cn(
            "text-sm font-medium transition-colors",
            isActivated ? "text-primary" : "text-muted-foreground"
          )}>
            {isRefreshing ? "Refreshing..." : isActivated ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance > 0 || isRefreshing ? Math.max(pullDistance, isRefreshing ? 60 : 0) : 0}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
