import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/shared/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { LoadingButton } from "@/shared/components/ui/loading-button";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";

import { PDFPreview } from "@/features/bookmarks/components/PDFPreview";
import { DOCXPreview } from "@/features/bookmarks/components/DOCXPreview";
import { VideoPreview } from "@/features/bookmarks/components/VideoPreview";
import { ThumbnailPreview } from "@/features/bookmarks/components/ThumbnailPreview";
import { RichNotesEditor } from "@/features/bookmarks/components/RichNotesEditor";
import { NotePreview } from "@/features/bookmarks/components/NotePreview";
import { Link2, FileText, Image as ImageIcon, Trash2, Save, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { CATEGORY_OPTIONS, DEFAULT_ITEM_TAG, SUPABASE_ITEMS_TABLE } from "@/features/bookmarks/constants";
import { generateSignedUrl } from "@/shared/lib/supabase-utils";
import { NetworkError, toTypedError } from "@/shared/types/errors";
import { UPDATE_ERRORS, getUpdateErrorMessage, ITEM_ERRORS } from "@/shared/lib/error-messages";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import type { Item } from "@/features/bookmarks/types";

// Character counter constants
const USER_NOTES_MAX_LENGTH = 100000;
interface DetailViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onUpdate: () => void;
}
export const DetailViewModal = ({
  open,
  onOpenChange,
  item,
  onUpdate
}: DetailViewModalProps) => {
  const [userNotes, setUserNotes] = useState(item?.user_notes || "");
  const [selectedTag, setSelectedTag] = useState<string>(item?.tags?.[0] || DEFAULT_ITEM_TAG);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setUserNotes(item.user_notes || "");
      setSelectedTag(item.tags?.[0] || DEFAULT_ITEM_TAG);
    }
  }, [item]);
  useEffect(() => {
    const generateSignedUrlForItem = async () => {
      if (!item?.content) {
        setSignedUrl(null);
        return;
      }

      // Skip signed URL for URL-type items (they use the URL directly)
      if (item.type === 'url') {
        setSignedUrl(null);
        return;
      }
      setLoadingSignedUrl(true);
      try {
        const url = await generateSignedUrl(item.content);
        setSignedUrl(url);
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setSignedUrl(null);
        toast.error(ITEM_ERRORS.PDF_LOAD_FAILED.title, {
          description: ITEM_ERRORS.PDF_LOAD_FAILED.message
        });
      } finally {
        setLoadingSignedUrl(false);
      }
    };
    generateSignedUrlForItem();
  }, [item]);
  const handleSave = useCallback(async () => {
    if (!item) return;
    if (userNotes.length > USER_NOTES_MAX_LENGTH) {
      toast.error(UPDATE_ERRORS.NOTES_TOO_LONG.title, {
        description: UPDATE_ERRORS.NOTES_TOO_LONG.message
      });
      return;
    }
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
        user_notes: userNotes,
        tags: [selectedTag]
      }).eq("id", item.id);
      if (error) throw error;
      toast.success("Changes saved!");
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = getUpdateErrorMessage(error);
      const typedError = toTypedError(error);
      const networkError = new NetworkError(errorMessage.message, typedError);
      console.error("Error saving:", networkError);
      toast.error(errorMessage.title, {
        description: errorMessage.message
      });
    } finally {
      setSaving(false);
    }
  }, [userNotes, selectedTag, item, onUpdate]);
  const handleDelete = useCallback(async () => {
    if (!item) return;
    setDeleting(true);
    setShowDeleteAlert(false);
    try {
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Item removed from your space.");
      onOpenChange(false);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = getUpdateErrorMessage(error);
      const typedError = toTypedError(error);
      const networkError = new NetworkError(errorMessage.message, typedError);
      console.error("Error deleting:", networkError);
      toast.error(errorMessage.title, {
        description: errorMessage.message
      });
    } finally {
      setDeleting(false);
    }
  }, [item, onOpenChange, onUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if modal is open
      if (!open) return;

      // Save shortcut: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Delete shortcut: Ctrl+D or Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setShowDeleteAlert(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSave]);
  const getIcon = useCallback(() => {
    if (!item) return null;
    switch (item.type) {
      case "url":
        return <Link2 className="h-5 w-5" />;
      case "note":
      case "document":
      case "file":
        return <FileText className="h-5 w-5" />;
      case "image":
        return <ImageIcon className="h-5 w-5" />;
      default:
        return null;
    }
  }, [item]);

  // Render preview section based on item type
  const renderPreview = () => {
    if (!item) return null;

    // For note-type items - show the note content as a styled preview
    if (item.type === 'note' && item.content) {
      return <div className="rounded-xl overflow-hidden bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/30 dark:border-amber-800/20 mb-4">
          <NotePreview content={item.content} variant="full" showProgress={true} className="min-h-[200px]" />
        </div>;
    }

    // For URL-type items
    if (item.type === 'url' && item.content) {
      // Check if it's a video URL (YouTube, Vimeo)
      if (isVideoUrl(item.content)) {
        return <VideoPreview url={item.content} title={item.title} className="mb-4" />;
      }

      // Show thumbnail for non-video URLs
      if (item.preview_image_url) {
        return <ThumbnailPreview imageUrl={item.preview_image_url} linkUrl={item.content} title={item.title} className="mb-4" />;
      }

      // Fallback for URLs without thumbnail
      return null;
    }

    // For file-type items (PDF, DOCX, etc.)
    if (item.content && item.type !== 'url' && item.type !== 'note') {
      return (
        <div className="h-full flex flex-col rounded-xl overflow-hidden bg-muted">
          {/* Fixed height container for preview - clips content */}
          <div className="h-[400px] overflow-hidden">
            {loadingSignedUrl ? (
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner size="sm" text="Loading file preview..." />
              </div>
            ) : signedUrl ? (
              <>
                {item.content?.toLowerCase().endsWith(".pdf") ? (
                  <PDFPreview url={signedUrl} className="h-full" />
                ) : item.content?.toLowerCase().endsWith(".docx") ? (
                  <DOCXPreview url={signedUrl} className="h-full" />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">File preview</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                File preview unavailable
              </div>
            )}
          </div>
          {/* "Open full PDF" link - always visible at bottom */}
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-2 text-sm font-medium text-primary hover:underline px-3 py-3 bg-muted/50 border-t border-border/50"
            >
              <ExternalLink className="h-4 w-4" />
              {item.content?.toLowerCase().endsWith(".pdf")
                ? "Open full PDF in browser"
                : item.content?.toLowerCase().endsWith(".docx")
                ? "Open full document in browser"
                : "Open file in browser"}
            </a>
          )}
        </div>
      );
    }
    return null;
  };
  if (!item) return null;

  // Shared content component - Horizontal layout
  const DetailContent = () => (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      {/* Left side - Preview */}
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          {renderPreview() || (
            <div className="h-full rounded-xl bg-muted flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary">{getIcon()}</span>
                </div>
                <p className="text-sm text-muted-foreground">No preview available</p>
              </div>
            </div>
          )}
        </div>
        
        {/* URL Link */}
        {item.type === "url" && item.content && (
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-3"
          >
            <Link2 className="h-4 w-4" />
            Open original
          </a>
        )}
      </div>

      {/* Right side - Details */}
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary">{getIcon()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold line-clamp-2" title={item.title}>{item.title}</h2>
            <p className="text-xs text-muted-foreground">{selectedTag}</p>
          </div>
        </div>

        {/* Summary */}
        {item.summary && (
          <div className="space-y-2.5 mb-6 pb-6 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">Summary</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
          </div>
        )}

        {/* Category */}
        <div className="space-y-2.5 mb-6">
          <label htmlFor="category-select" className="text-sm font-semibold text-foreground block">
            Category
          </label>
          <select
            id="category-select"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            aria-label="Select category"
          >
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
            {!CATEGORY_OPTIONS.some((option) => option.value === selectedTag) && (
              <option value={selectedTag}>{selectedTag}</option>
            )}
          </select>
        </div>

        {/* Reduced spacer */}
        <div className="flex-1 min-h-4" />

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border/50">
          <LoadingButton
            onClick={handleSave}
            loading={saving}
            className="flex-1"
            aria-label="Save changes"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </LoadingButton>
          <Button
            onClick={() => setShowDeleteAlert(true)}
            disabled={deleting}
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile content - vertical layout
  const MobileDetailContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary">{getIcon()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold line-clamp-2" title={item.title}>{item.title}</h2>
            <p className="text-xs text-muted-foreground">{selectedTag}</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {renderPreview()}

      {/* URL Link */}
      {item.type === "url" && item.content && (
        <a
          href={item.content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Link2 className="h-4 w-4" />
          Open original
        </a>
      )}

      {/* Summary */}
      {item.summary && (
        <div className="space-y-2.5 pb-6 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Summary</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
        </div>
      )}

      {/* Category */}
      <div className="space-y-2.5">
        <label htmlFor="category-select-mobile" className="text-sm font-semibold text-foreground block">
          Category
        </label>
        <select
          id="category-select-mobile"
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          aria-label="Select category"
        >
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
          {!CATEGORY_OPTIONS.some((option) => option.value === selectedTag) && (
            <option value={selectedTag}>{selectedTag}</option>
          )}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-border/50">
        <LoadingButton
          onClick={handleSave}
          loading={saving}
          className="flex-1"
          aria-label="Save changes"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </LoadingButton>
        <Button
          onClick={() => setShowDeleteAlert(true)}
          disabled={deleting}
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label="Delete item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  return <>
      {isMobile ? <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[95vh] pb-safe">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{item.title}</DrawerTitle>
              <DrawerDescription>Detailed item view</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <MobileDetailContent />
            </div>
          </DrawerContent>
        </Drawer> : <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent 
            className="w-[1100px] max-w-[95vw] h-[600px] overflow-hidden border-0 glass-card p-6"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>Detailed item view</DialogDescription>
            </DialogHeader>
            <DetailContent />
          </DialogContent>
        </Dialog>}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{item?.title}" from your space. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};