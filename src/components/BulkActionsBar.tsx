import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
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
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-background/95 backdrop-blur-sm border rounded-xl p-3 md:p-4 shadow-2xl flex items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          {selectedCount < totalCount ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-xs h-7"
            >
              Select all ({totalCount})
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="text-xs h-7"
            >
              Deselect all
            </Button>
          )}
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
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
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
