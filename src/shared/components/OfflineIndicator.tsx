import { useState, useEffect, useRef } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // Hide the "back online" message after 3 seconds
      timeoutRef.current = setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      // Clear any existing timeout when going offline
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Clear timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[100]",
        "px-4 py-2 rounded-full shadow-lg",
        "flex items-center gap-2",
        "transition-all duration-300",
        "animate-in slide-in-from-top-5 fade-in",
        isOnline
          ? "bg-green-500/90 text-white backdrop-blur-sm"
          : "bg-destructive/90 text-destructive-foreground backdrop-blur-sm"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">You're offline</span>
        </>
      )}
    </div>
  );
};
