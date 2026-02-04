import { useState } from 'react';
import { Button } from "@/shared/components/ui";
import { Plus, Activity, FileText, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface HealthSpeedDialProps {
  onAddMeasurement: () => void;
  onAddDocument: () => void;
}

/**
 * Unified FAB with speed-dial menu for health module.
 * Opens menu on tap with options:
 * - Log Measurement
 * - Upload Document
 */
export const HealthSpeedDial = ({
  onAddMeasurement,
  onAddDocument,
}: HealthSpeedDialProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Speed dial menu items */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium glass-light px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              Log Measurement
            </span>
            <Button
              onClick={() => handleAction(onAddMeasurement)}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl"
              aria-label="Log measurement"
            >
              <Activity className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium glass-light px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              Upload Document
            </span>
            <Button
              onClick={() => handleAction(onAddDocument)}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl"
              aria-label="Upload document"
            >
              <FileText className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main FAB */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl hover:shadow-xl premium-transition p-0',
          isOpen && 'rotate-45'
        )}
        aria-label={isOpen ? 'Close menu' : 'Open add menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Plus className="w-6 h-6" aria-hidden="true" />
        )}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
