import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PDFPreview } from "@/components/PDFPreview";
import { DOCXPreview } from "@/components/DOCXPreview";
import { VideoPreview } from "@/components/VideoPreview";
import { ThumbnailPreview } from "@/components/ThumbnailPreview";
import { RichNotesEditor } from "@/components/RichNotesEditor";
import { NotePreview } from "@/components/NotePreview";
import { Link2, FileText, Image as ImageIcon, Trash2, Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CATEGORY_OPTIONS,
  DEFAULT_ITEM_TAG,
  SUPABASE_ITEMS_TABLE,
} from "@/constants";
import { generateSignedUrl } from "@/lib/supabase-utils";
import { NetworkError, toTypedError } from "@/types/errors";
import { UPDATE_ERRORS, getUpdateErrorMessage, ITEM_ERRORS } from "@/lib/error-messages";
import { isVideoUrl } from "@/lib/video-utils";

import type { Item } from "@/types";

// Character counter constants
const USER_NOTES_MAX_LENGTH = 100000;

interface DetailViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onUpdate: () => void;
}

export const DetailViewModal = ({ open, onOpenChange, item, onUpdate }: DetailViewModalProps) => {
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
      const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({ user_notes: userNotes, tags: [selectedTag] })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Changes saved!");
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = getUpdateErrorMessage(error);
      const typedError = toTypedError(error);
      const networkError = new NetworkError(
        errorMessage.message,
        typedError
      );
      
      console.error("Error saving:", networkError);
      toast.error(errorMessage.title, { description: errorMessage.message });
    } finally {
      setSaving(false);
    }
  }, [userNotes, selectedTag, item, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    setDeleting(true);
    setShowDeleteAlert(false);
    try {
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Item removed from your space.");
      onOpenChange(false);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = getUpdateErrorMessage(error);
      const typedError = toTypedError(error);
      const networkError = new NetworkError(
        errorMessage.message,
        typedError
      );
      
      console.error("Error deleting:", networkError);
      toast.error(errorMessage.title, { description: errorMessage.message });
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
      return (
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/30 dark:border-amber-800/20 mb-4">
          <NotePreview 
            content={item.content} 
            variant="full" 
            showProgress={true}
            className="min-h-[200px]"
          />
        </div>
      );
    }

    // For URL-type items
    if (item.type === 'url' && item.content) {
      // Check if it's a video URL (YouTube, Vimeo)
      if (isVideoUrl(item.content)) {
        return (
          <VideoPreview 
            url={item.content} 
            title={item.title}
            className="mb-4"
          />
        );
      }
      
      // Show thumbnail for non-video URLs
      if (item.preview_image_url) {
        return (
          <ThumbnailPreview
            imageUrl={item.preview_image_url}
            linkUrl={item.content}
            title={item.title}
            className="mb-4"
          />
        );
      }
      
      // Fallback for URLs without thumbnail
      return null;
    }

    // For file-type items (PDF, DOCX, etc.)
    if (item.content && item.type !== 'url' && item.type !== 'note') {
      return (
        <div className="rounded-xl overflow-hidden bg-muted">
          {loadingSignedUrl ? (
            <div className="p-4 h-64 md:h-80 flex items-center justify-center">
              <LoadingSpinner size="sm" text="Loading file preview..." />
            </div>
          ) : signedUrl ? (
            <>
              {item.content?.toLowerCase().endsWith(".pdf") ? (
                <PDFPreview url={signedUrl} className="h-64 md:h-80" />
              ) : item.content?.toLowerCase().endsWith(".docx") ? (
                <DOCXPreview url={signedUrl} className="h-64 md:h-80" />
              ) : (
                <div className="p-4 h-64 md:h-80 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">File preview</p>
                  </div>
                </div>
              )}
              <a 
                href={signedUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block text-xs text-primary hover:underline px-3 py-2 bg-muted/50 border-t border-border/50 min-h-[44px] flex items-center"
              >
                {item.content?.toLowerCase().endsWith(".pdf") ? "Open full PDF" : 
                 item.content?.toLowerCase().endsWith(".docx") ? "Open full document" : "Open file"}
              </a>
            </>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">File preview unavailable</div>
          )}
        </div>
      );
    }

    return null;
  };

  if (!item) return null;

  const breadcrumbItems = [
    { label: "Home", onClick: () => onOpenChange(false) },
    ...(selectedTag ? [{ label: selectedTag }] : []),
    { label: item.title },
  ];

  // Shared content component
  const DetailContent = () => (
    <>
      {/* Breadcrumbs and Header */}
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-primary opacity-60">{getIcon()}</div>
            <h2 className="text-lg md:text-xl font-semibold">{item.title}</h2>
          </div>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground min-h-[44px]"
              aria-label="Go back to list"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* RESPONSIVE LAYOUT */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full overflow-hidden">
        {/* LEFT COLUMN */}
        <div className="md:w-1/3 flex flex-col gap-4 min-w-0">
          {/* Preview Section */}
          {renderPreview()}

          {/* Visit Link for URL items */}
          {item.type === "url" && item.content && (
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Open Original Link
            </a>
          )}

          {/* Category Tag Section */}
          <div>
            <label htmlFor="category-select" className="font-semibold text-sm text-muted-foreground mb-2 block">Category</label>
            <select
              id="category-select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-3 md:py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] md:min-h-0"
              aria-label="Select category for this item"
            >
              {CATEGORY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {!CATEGORY_OPTIONS.some((option) => option.value === selectedTag) && (
                <option value={selectedTag}>{selectedTag}</option>
              )}
            </select>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="md:flex-1 flex flex-col gap-6 min-w-0">
          {/* Summary */}
          {item.summary && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Summary</h3>
              <p className="text-base leading-body prose-wide">{item.summary}</p>
            </div>
          )}

          {/* Rich Notes Section */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Personal Notes</h3>
            <RichNotesEditor
              value={userNotes}
              onChange={setUserNotes}
              placeholder="Add your personal notes, checklists, or tasks..."
              maxLength={USER_NOTES_MAX_LENGTH}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <LoadingButton
              onClick={handleSave}
              loading={saving}
              size="lg"
              className="flex-1 min-h-[48px]"
              aria-label="Save changes (Ctrl+S or Cmd+S)"
            >
              <Save className="h-4 w-4 mr-2" aria-hidden="true" />
              Save Changes
            </LoadingButton>
            <Button
              onClick={() => setShowDeleteAlert(true)}
              disabled={deleting}
              variant="outline"
              size="lg"
              className="border-destructive/20 text-destructive hover:bg-destructive/10 min-h-[48px]"
              aria-label="Delete item (Ctrl+D or Cmd+D)"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[95vh] pb-safe">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{item.title}</DrawerTitle>
              <DrawerDescription>Detailed item view</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <DetailContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto border-0 glass-card">
            <DialogHeader className="sr-only">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>Detailed item view</DialogDescription>
            </DialogHeader>
            <DetailContent />
          </DialogContent>
        </Dialog>
      )}

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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
