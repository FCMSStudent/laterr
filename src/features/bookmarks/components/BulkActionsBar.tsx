import { Trash2, X, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface BulkActionsBarProps {
  mode?: "active" | "trash";
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => Promise<void>;
  onRestore?: () => Promise<void>;
  onPermanentDelete?: () => Promise<void>;
  onCancel: () => void;
}

export const BulkActionsBar = ({
  mode = "active",
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onRestore,
  onPermanentDelete,
  onCancel
}: BulkActionsBarProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };
  const handleRestore = async () => {
    if (!onRestore) return;
    setIsRestoring(true);
    try {
      await onRestore();
    } finally {
      setIsRestoring(false);
    }
  };
  const handlePermanentDelete = async () => {
    if (!onPermanentDelete) return;
    setIsPurging(true);
    try {
      await onPermanentDelete();
    } finally {
      setIsPurging(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="glass-medium rounded-full px-4 py-2 shadow-2xl flex items-center gap-2">
        <span className="text-sm font-medium px-2">
          {selectedCount}
        </span>

        {selectedCount < totalCount ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="text-xs h-8 rounded-full"
            aria-label={`Select all ${totalCount} items`}
          >
            All
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="text-xs h-8 rounded-full"
            aria-label="Deselect all items"
          >
            None
          </Button>
        )}

        <div className="h-6 w-px bg-border" />

        {mode === "active" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Move ${selectedCount} items to trash`}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move {selectedCount} items to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can restore them later from Trash. Items auto-delete after 30 days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={isRestoring}
              className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary"
              aria-label={`Restore ${selectedCount} items`}
              onClick={handleRestore}
            >
              {isRestoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPurging}
                  className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${selectedCount} items permanently`}
                >
                  {isPurging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedCount} items permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Files will be removed from storage.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handlePermanentDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0 rounded-full"
          aria-label="Cancel selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
