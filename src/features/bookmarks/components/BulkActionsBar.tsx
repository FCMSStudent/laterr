import { Trash2, X, CheckCircle, RotateCcw, Archive } from "lucide-react";
import { Button } from "@/ui";
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
} from "@/ui";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ItemStatus } from "@/features/bookmarks/types";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  /** Current view status - determines which actions to show */
  currentStatus?: ItemStatus;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  /** Move to trash (for active items) */
  onTrash?: () => Promise<void>;
  /** Archive items (mark as read/watched) */
  onArchive?: () => Promise<void>;
  /** Restore items (from archive or trash) */
  onRestore?: () => Promise<void>;
  /** Permanently delete (for trashed items) */
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  totalCount,
  currentStatus = 'active',
  onSelectAll,
  onDeselectAll,
  onTrash,
  onArchive,
  onRestore,
  onDelete,
  onCancel
}: BulkActionsBarProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, actionName: string) => {
    setIsLoading(true);
    setLoadingAction(actionName);
    try {
      await action();
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
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

        {/* Active items: Archive action */}
        {currentStatus === 'active' && onArchive && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => handleAction(onArchive, 'archive')}
            className="h-8 px-3 rounded-full hover:bg-primary/10 hover:text-primary"
            aria-label={`Archive ${selectedCount} items`}
          >
            {loadingAction === 'archive' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Done</span>
              </>
            )}
          </Button>
        )}

        {/* Archived/Trashed items: Restore action */}
        {(currentStatus === 'archived' || currentStatus === 'trashed') && onRestore && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => handleAction(onRestore, 'restore')}
            className="h-8 px-3 rounded-full hover:bg-primary/10 hover:text-primary"
            aria-label={`Restore ${selectedCount} items`}
          >
            {loadingAction === 'restore' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Restore</span>
              </>
            )}
          </Button>
        )}

        {/* Active items: Move to Trash confirmation */}
        {currentStatus === 'active' && onTrash && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isLoading}
                className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Move ${selectedCount} items to trash`}
              >
                {loadingAction === 'trash' ? (
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
                  Items will be moved to trash and automatically deleted after 30 days. You can restore them at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleAction(onTrash, 'trash')}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Trashed items: Permanent delete confirmation */}
        {currentStatus === 'trashed' && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isLoading}
                className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Permanently delete ${selectedCount} items`}
              >
                {loadingAction === 'delete' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete {selectedCount} items?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. These items will be permanently deleted from your collection.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleAction(onDelete, 'delete')}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
