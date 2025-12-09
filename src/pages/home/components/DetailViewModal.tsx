import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogDescription } from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
// Fixed: Lazy load document preview components to prevent "Cannot access before initialization" error
// The react-pdf library sets pdfjs.GlobalWorkerOptions at module level, which can cause
// initialization order issues when bundled. Lazy loading ensures these libraries are only
// loaded when actually needed and after the main bundle is initialized.
const PDFPreview = lazy(() => import("./PDFPreview").then(m => ({ default: m.PDFPreview })));
const DOCXPreview = lazy(() => import("./DOCXPreview").then(m => ({ default: m.DOCXPreview })));
import { Link2, FileText, Image as ImageIcon, Trash2, Save, ZoomIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  CATEGORY_OPTIONS,
  DEFAULT_ITEM_TAG,
  SUPABASE_ITEMS_TABLE,
} from "@/constants";
import { generateSignedUrl } from "@/shared/lib/supabase-utils";
import { NetworkError, toTypedError } from "@/shared/types/errors";
import { UPDATE_ERRORS, getUpdateErrorMessage, ITEM_ERRORS } from "@/shared/lib/error-messages";

import type { Item } from "@/shared/types";

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
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateSignedUrlForItem = async () => {
      // Skip signed URL for URL types - they use preview_image_url directly
      if (!item?.content || item.type === "url") {
        setSignedUrl(null);
        return;
      }
      
      setLoadingSignedUrl(true);
      setImageLoadError(false); // Reset image error state when item changes
      try {
        const url = await generateSignedUrl(item.content);
        setSignedUrl(url);
      } catch (error: unknown) {
        const typedError = toTypedError(error);
        console.error('Error generating signed URL:', typedError);
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

  // Extract domain from URL for display (memoized)
  const extractDomain = useCallback((url: string | null): string => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }, []);

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
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error formatting date:', typedError);
      return 'recently';
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

  // Get dynamic background based on content type
  const getContentBackground = () => {
    // YouTube → black background
    if (item.type === "url" && isYouTubeUrl(item.content)) {
      return "bg-black/90";
    }
    
    // PDFs/Docs → off-white paper tone
    if (item.content?.toLowerCase().endsWith(".pdf")) {
      return "bg-stone-50 dark:bg-stone-900";
    }
    if (item.content?.toLowerCase().endsWith(".docx") || item.type === "document") {
      return "bg-stone-50 dark:bg-stone-900";
    }
    
    // Images → neutral gray with subtle backdrop
    if (item.type === "image") {
      return "bg-neutral-100 dark:bg-neutral-900";
    }
    
    // URLs/Articles → light reading-safe background
    if (item.type === "url") {
      return "bg-slate-50 dark:bg-slate-900";
    }
    
    // Default fallback
    return "bg-muted/30";
  };

  // Get layout width based on image orientation
  const getLayoutWidth = () => {
    if (item.type === "image" && imageLoaded) {
      return isPortrait ? "sm:w-[45%]" : "sm:w-[65%]";
    }
    // Default for other content types
    return "sm:w-[65%]";
  };

  // Handle image load to detect orientation
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    setIsPortrait(aspectRatio < 1);
    setImageLoaded(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl h-[100vh] sm:h-[80vh] p-0 overflow-hidden border-0 glass-card">
        <DialogDescription className="sr-only">Detailed item view</DialogDescription>

        {/* SINGLE SCROLL CONTAINER - wraps all content */}
        <div className="h-full overflow-y-auto">
          {/* RESPONSIVE LAYOUT - Stacked on mobile, horizontal on desktop */}
          <div className="flex flex-col sm:flex-row h-full">
            {/* LEFT COLUMN - MEDIA PREVIEW */}
            <div className={`flex-1 ${getContentBackground()} flex items-center justify-center min-w-0 sm:rounded-l-lg overflow-hidden min-h-[300px] sm:min-h-[500px] @container transition-all duration-300`}>
            {/* 1. YouTube URL → Embed player */}
            {youtubeVideoId ? (
              <div className="relative w-full h-full group">
                <YouTubeEmbed 
                  videoId={youtubeVideoId} 
                  className="h-full"
                />
                {/* Clickable overlay - shown on hover only, allows iframe controls when not hovering */}
                <a 
                  href={item.content || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  aria-label="Open YouTube video in new tab"
                >
                  <Link2 className="h-8 w-8 text-white drop-shadow-lg" />
                </a>
              </div>
            ) : 
            
            /* 2. URL type with preview_image_url → Show thumbnail directly */
            item.type === "url" && item.preview_image_url?.trim() ? (
              imageLoadError ? (
                <a
                  href={item.content || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 h-full flex items-center justify-center group cursor-pointer hover:bg-black/80 transition-colors"
                  aria-label="Open link in new tab"
                >
                  <div className="text-center">
                    <Link2 className="h-12 w-12 mx-auto mb-2 text-muted-foreground group-hover:text-white transition-colors" />
                    <p className="text-sm text-muted-foreground group-hover:text-white/90 transition-colors">Preview unavailable - Click to open</p>
                  </div>
                </a>
              ) : (
                <a
                  href={item.content || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-full h-full group cursor-pointer block p-6 flex items-center justify-center"
                  aria-label="Open link in new tab"
                >
                  <img 
                    src={item.preview_image_url} 
                    alt={item.title}
                    loading="lazy"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    onError={() => setImageLoadError(true)}
                  />
                  {/* Hover overlay to indicate clickability */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Link2 className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
                </a>
              )
            ) : 
            
            /* 3. URL type without preview → Show icon placeholder with domain */
            item.type === "url" ? (
              <a
                href={item.content || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 h-full flex items-center justify-center group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open link in new tab"
              >
                <div className="text-center max-w-md">
                  <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-base sm:text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                  {extractDomain(item.content) && (
                    <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-3 py-1 rounded-md inline-block mb-3">
                      {extractDomain(item.content)}
                    </p>
                  )}
                  {item.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">{item.summary}</p>
                  )}
                  <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Click to open in new tab</p>
                </div>
              </a>
            ) :
            
            /* 4. File/image/document types → Use signed URL logic (existing) */
            item.content ? (
              <div className="w-full h-full">
                {loadingSignedUrl ? (
                  <div className="p-4 h-full flex items-center justify-center">
                    <LoadingSpinner size="sm" text="Loading file preview..." />
                  </div>
                ) : signedUrl ? (
                  <>
                    {item.content?.toLowerCase().endsWith(".pdf") ? (
                      <Suspense fallback={<LoadingSpinner size="sm" text="Loading PDF preview..." />}>
                        <PDFPreview url={signedUrl} className="h-full" />
                      </Suspense>
                    ) : item.content?.toLowerCase().endsWith(".docx") ? (
                      <Suspense fallback={<LoadingSpinner size="sm" text="Loading document preview..." />}>
                        <DOCXPreview url={signedUrl} className="h-full" />
                      </Suspense>
                    ) : item.type === "image" ? (
                      imageLoadError ? (
                        <div className="p-4 h-full flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Failed to load image</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`relative w-full h-full p-6 flex items-center justify-center group ${imageZoomed ? 'overflow-auto' : 'overflow-hidden'}`}>
                          <img 
                            src={signedUrl} 
                            alt={item.title}
                            loading="lazy"
                            className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 ${imageZoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in hover:brightness-105'}`}
                            onLoad={handleImageLoad}
                            onClick={() => setImageZoomed(!imageZoomed)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setImageZoomed(!imageZoomed);
                              }
                            }}
                            onError={() => {
                              setImageLoadError(true);
                              toast.error("Failed to load image");
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={imageZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                            aria-expanded={imageZoomed}
                          />
                          {/* Zoom indicator */}
                          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white px-3 py-2 rounded-lg flex items-center gap-2 pointer-events-none">
                            <ZoomIn className="h-4 w-4" />
                            <span className="text-xs font-medium">Click to {imageZoomed ? 'zoom out' : 'zoom in'}</span>
                          </div>
                        </div>
                      )
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
            ) : null}
            </div>

            {/* RIGHT COLUMN - INFO PANEL (Fixed width: 360px on desktop) */}
            <div 
              className="w-full sm:w-[360px] flex flex-col min-w-0 shrink-0"
              role="region"
              aria-label="Item details panel"
            >
              {/* CONTENT AREA - NO nested scrolling */}
              <div 
                className="flex flex-col gap-4 p-6 pb-4"
                tabIndex={0}
              >
              {/* Header: Title and Metadata */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold mb-2">{item.title}</h2>
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(item.created_at)} • {getSourceTypeLabel()}
                </p>
              </div>

              {/* Summary/TLDW Section */}
              {item.summary && (
                <div className="border border-border rounded-lg p-4 bg-muted/20">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    {item.type === "url" && isYouTubeUrl(item.content) ? "TLDW" : "SUMMARY"}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/90 font-serif">{item.summary}</p>
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

              {/* ACTION BUTTONS - Pushed to bottom with mt-auto */}
              <div 
                className="shrink-0 flex justify-end gap-3 pt-6 mt-auto relative before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border/50 before:to-transparent"
                role="group"
                aria-label="Item actions"
              >
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        variant="outline"
                        size="default"
                        className="min-h-[44px] min-w-[44px] px-4"
                        aria-label="Save changes"
                      >
                        {saving ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                            <span>Save</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Save changes (Ctrl+S or ⌘S)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowDeleteAlert(true)}
                        disabled={deleting}
                        variant="outline"
                        size="default"
                        className="min-h-[44px] min-w-[44px] px-4 border-destructive/20 text-destructive hover:bg-destructive/10"
                        aria-label="Delete item"
                      >
                        {deleting ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                            <span>Delete</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Delete item (Ctrl+D or ⌘D)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              </div>
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
