import { useState, lazy, Suspense } from 'react';
import { Button } from "@/shared/components/ui";
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const HealthChatPanel = lazy(() => import('@/features/health/components/HealthChatPanel').then(({ HealthChatPanel }) => ({ default: HealthChatPanel })));

/**
 * Floating AI chat button for health module.
 * Opens HealthChatPanel in a modal/drawer when tapped.
 * Positioned at bottom-right.
 */
export const FloatingAIChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-32 right-4 z-40',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-purple-500 to-pink-500',
          'hover:from-purple-600 hover:to-pink-600',
          'text-white shadow-2xl hover:shadow-xl',
          'premium-transition hover:scale-110 p-0'
        )}
        aria-label="Open AI health assistant"
      >
        <Sparkles className="w-6 h-6" aria-hidden="true" />
      </Button>

      {/* Chat panel modal/drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-x-0 bottom-0 md:right-4 md:bottom-4 md:left-auto md:w-96 md:max-h-[600px] h-[80vh] md:h-auto bg-background border rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold">AI Health Assistant</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
                aria-label="Close AI assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat content */}
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              }>
                <HealthChatPanel />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
