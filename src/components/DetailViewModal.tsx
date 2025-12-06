import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PDFPreview } from "@/components/PDFPreview";
import { DOCXPreview } from "@/components/DOCXPreview";
import { Link2, FileText, Image as ImageIcon, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  CATEGORY_OPTIONS,
  DEFAULT_ITEM_TAG,
  SUPABASE_ITEMS_TABLE,
} from "@/constants";
import { generateSignedUrl } from "@/lib/supabase-utils";
import { NetworkError, toTypedError } from "@/types/errors";
import { UPDATE_ERRORS, getUpdateErrorMessage, ITEM_ERRORS } from "@/lib/error-messages";

import type { Item } from "@/types";

// Character counter constants
const USER_NOTES_MAX_LENGTH = 100000;
const CHAR_WARNING_THRESHOLD = 0.9;

// YouTube URL detection
const isYouTubeUrl = (url: string | null): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.youtube.com' || 
           urlObj.hostname === 'youtube.com' || 
           urlObj.hostname === 'youtu.be';
  } catch {
    return false;
  }
};

// Extract video ID from various YouTube URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

interface YouTubeEmbedProps {
  videoId: string;
  className?: string;
}

const YouTubeEmbed = ({ videoId, className }: YouTubeEmbedProps) => {
  // Validate videoId: YouTube IDs are 11 chars, alphanumeric with _ and -
  const isValidVideoId = /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  
  if (!isValidVideoId) {
    return (
      <div className={`p-4 text-sm text-muted-foreground ${className}`}>
        Invalid YouTube video ID
      </div>
    );
  }
  
  return (
    <div className={`relative w-full ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full rounded-xl border-0"
      />
    </div>
  );
};

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

  useEffect(() => {
    const generateSignedUrlForItem = async () => {
      if (!item?.content) {
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
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSave, handleDelete]);

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

  if (!item) return null;

  // Cache YouTube video ID to avoid duplicate extraction
  const youtubeVideoId = item.type === "url" && isYouTubeUrl(item.content)
    ? extractYouTubeVideoId(item.content!) 
    : null;

  // Format the created date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true
      });
    } catch {
      return '';
    }
  };

  // Get source type label
  const getSourceTypeLabel = () => {
    if (item.type === "url" && isYouTubeUrl(item.content)) return "YouTube";
    switch (item.type) {
      case "url": return "URL";
      case "note": return "Note";
      case "document": return "Document";
      case "file": return "File";
      case "image": return "Image";
      default: return "Item";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] p-0 overflow-hidden border-0 glass-card">
        <DialogDescription className="sr-only">Detailed item view</DialogDescription>

        {/* HORIZONTAL LAYOUT */}
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* LEFT COLUMN - MEDIA PREVIEW */}
          <div className="md:w-[65%] bg-black/90 flex items-center justify-center min-w-0 rounded-l-lg overflow-hidden min-h-[400px] md:min-h-[500px]">
            {/* Check for YouTube URL first */}
            {youtubeVideoId ? (
              <div className="w-full h-full">
                <YouTubeEmbed 
                  videoId={youtubeVideoId} 
                  className="h-full"
                />
              </div>
            ) : item.content && (
              <div className="w-full h-full">
                {loadingSignedUrl ? (
                  <div className="p-4 h-full flex items-center justify-center">
                    <LoadingSpinner size="sm" text="Loading file preview..." />
                  </div>
                ) : signedUrl ? (
                  <>
                    {item.content?.toLowerCase().endsWith(".pdf") ? (
                      <PDFPreview url={signedUrl} className="h-full" />
                    ) : item.content?.toLowerCase().endsWith(".docx") ? (
                      <DOCXPreview url={signedUrl} className="h-full" />
                    ) : item.type === "image" ? (
                      <img 
                        src={signedUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-4 h-full flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">File preview</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground h-full flex items-center justify-center">
                    {getIcon()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - INFO PANEL */}
          <div className="md:w-[35%] flex flex-col gap-4 p-6 min-w-0 overflow-y-auto max-h-[90vh]">
            {/* Header: Title and Metadata */}
            <div>
              <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
              <p className="text-xs text-muted-foreground">
                Added {formatDate(item.created_at)} • {getSourceTypeLabel()}
              </p>
            </div>

            {/* Summary/TLDW Section */}
            {item.summary && (
              <div className="border border-border rounded-lg p-3">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  {item.type === "url" && isYouTubeUrl(item.content) ? "TLDW" : "SUMMARY"}
                </h3>
                <p className="text-sm leading-relaxed">{item.summary}</p>
              </div>
            )}

            {/* Category Tag Section */}
            <div>
              <label htmlFor="category-select" className="text-xs font-semibold text-muted-foreground mb-2 block">CATEGORY</label>
              <select
                id="category-select"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

            {/* Notes Section */}
            <div className="flex-1">
              <label htmlFor="user-notes-textarea" className="text-xs font-semibold text-muted-foreground mb-2 block">NOTES</label>
              <div className="space-y-2">
                <Textarea
                  id="user-notes-textarea"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Add your personal notes..."
                  maxLength={USER_NOTES_MAX_LENGTH}
                  className="glass-input border-0 min-h-[80px] text-sm leading-relaxed resize-none"
                  aria-describedby="notes-char-count"
                />
                <div className="flex justify-end">
                  <p 
                    id="notes-char-count" 
                    className={`text-xs font-medium transition-colors ${
                      userNotes.length > USER_NOTES_MAX_LENGTH * CHAR_WARNING_THRESHOLD 
                        ? 'text-destructive' 
                        : 'text-muted-foreground'
                    }`}
                    aria-live="polite"
                  >
                    {userNotes.length.toLocaleString()} / {USER_NOTES_MAX_LENGTH.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons as Icons */}
            <div className="flex justify-center gap-2 pt-4 border-t border-border mt-auto">
              <Button
                onClick={handleSave}
                disabled={saving}
                variant="outline"
                size="icon"
                className="h-10 w-10"
                aria-label="Save changes (Ctrl+S or Cmd+S)"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                onClick={() => setShowDeleteAlert(true)}
                disabled={deleting}
                variant="outline"
                size="icon"
                className="h-10 w-10 border-destructive/20 text-destructive hover:bg-destructive/10"
                aria-label="Delete item (Ctrl+D or Cmd+D)"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      
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
            <AlertDialogCancel className="glass-input">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
