import { Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
} from "@/shared/components/ui/alert-dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onCancel
}: BulkActionsBarProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-background/95 backdrop-blur-sm border rounded-full px-4 py-2 shadow-2xl flex items-center gap-2">
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${selectedCount} items`}
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
              <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. These items will be permanently deleted from your collection.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete {selectedCount} items
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
