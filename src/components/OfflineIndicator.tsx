import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const OfflineIndicator = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <Alert
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-md glass-card border-destructive/50"
      variant="destructive"
    >
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="ml-2">
        You're offline. Some features may be unavailable.
      </AlertDescription>
    </Alert>
  );
};
