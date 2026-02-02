import { useState, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/ui";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/ui";
import { Button } from "@/ui";
import { LoadingSpinner } from "@/ui";
import { PDFPreview } from "@/features/bookmarks/components/PDFPreview";
import { DOCXPreview } from "@/features/bookmarks/components/DOCXPreview";
import { VideoPreview } from "@/features/bookmarks/components/VideoPreview";
import { ThumbnailPreview } from "@/features/bookmarks/components/ThumbnailPreview";
import { NotePreview } from "@/features/bookmarks/components/NotePreview";
import { CardDetailRightPanel } from "@/features/bookmarks/components/CardDetailRightPanel";
import { Link2, FileText, Image as ImageIcon, Trash2, Save, ExternalLink, Plus, Globe, Clock, X, Edit2 } from "lucide-react";
import { Badge } from "@/ui";
import { Input, Textarea } from "@/ui";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { DEFAULT_ITEM_TAG, SUPABASE_ITEMS_TABLE } from "@/features/bookmarks/constants";
import { generateSignedUrl, generateSignedUrlsForItems } from "@/shared/lib/supabase-utils";
import { toTypedError } from "@/shared/types/errors";
import { UPDATE_ERRORS, getUpdateErrorMessage, ITEM_ERRORS } from "@/shared/lib/error-messages";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import type { Item } from "@/features/bookmarks/types";
import { useDebounce } from "@/shared/hooks/use-debounce";

// Constants
const USER_NOTES_MAX_LENGTH = 10000;
const AUTO_SAVE_DELAY = 1000;
const normalizeTag = (t: string) => t.trim().toLowerCase();
const areTagsEqual = (a: string[], b: string[]) => {
  const A = [...a].map(normalizeTag).sort();
  const B = [...b].map(normalizeTag).sort();
  return A.length === B.length && A.every((v, i) => v === B[i]);
};
const safeParseUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};
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
  const [tags, setTags] = useState<string[]>(item?.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const isMobile = useIsMobile();
  const debouncedNotes = useDebounce(userNotes, AUTO_SAVE_DELAY);

  // Extract item id to avoid optional chaining in dependency arrays (not allowed by esbuild)
  const itemId = item?.id;
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const editTagInputRef = useRef<HTMLInputElement>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const prevIsAddingTagRef = useRef(false);
  const prevEditingTagIndexRef = useRef<number | null>(null);

  // Focus tag input when adding - only when transitioning to true
  useEffect(() => {
    if (isAddingTag && !prevIsAddingTagRef.current && tagInputRef.current) {
      // Use setTimeout to ensure focus happens after any blur events
      // Match the 100ms delay used in blur handlers to prevent race conditions
      setTimeout(() => {
        if (tagInputRef.current && isAddingTag) {
          tagInputRef.current.focus();
        }
      }, 100);
    }
    prevIsAddingTagRef.current = isAddingTag;
  }, [isAddingTag]);
  
  // Focus tag input when editing - only when transitioning to a valid index
  useEffect(() => {
    if (editingTagIndex !== null && editingTagIndex !== prevEditingTagIndexRef.current && editTagInputRef.current) {
      // Use setTimeout to ensure focus happens after any blur events
      // Match the 100ms delay used in blur handlers to prevent race conditions
      setTimeout(() => {
        if (editTagInputRef.current && editingTagIndex !== null) {
          editTagInputRef.current.focus();
          editTagInputRef.current.select();
        }
      }, 100);
    }
    prevEditingTagIndexRef.current = editingTagIndex;
  }, [editingTagIndex]);

  // Reset state when item changes (different item selected)
  // Use itemId to track when we switch to a DIFFERENT item
  const prevItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (item) {
      // Only reset state when switching to a different item, not on refetch
      if (prevItemIdRef.current !== item.id) {
        setUserNotes(item.user_notes || "");
        setTags(item.tags || []);
        setIsAddingTag(false);
        setNewTagInput("");
        setEditingTagIndex(null);
        setEditingTagValue("");
        prevItemIdRef.current = item.id;
      }
    }
  }, [item]);

  // Autosave notes - placeholder, actual save will be triggered by handleSave defined below
  // We use a ref to avoid circular dependency issues
  const handleSaveRef = useRef<((notes: string, tags: string[], silent?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!item || !open) return;
    const itemNotes = item.user_notes || "";
    const itemTags = item.tags || [];
    const notesChanged = debouncedNotes !== itemNotes;
    const tagsChanged = !areTagsEqual(tags, itemTags);
    if ((notesChanged || tagsChanged) && handleSaveRef.current) {
      handleSaveRef.current(debouncedNotes, tags, true);
    }
  }, [debouncedNotes, tags, open, item]);

  // Fetch related items (same tag, excluding current)
  useEffect(() => {
    const fetchRelated = async () => {
      if (!open || !item) {
        setRelatedItems([]);
        return;
      }
      setLoadingRelated(true);
      try {
        const primaryTag = tags[0] || DEFAULT_ITEM_TAG;
        const {
          data,
          error
        } = await supabase.from(SUPABASE_ITEMS_TABLE).select("*").contains("tags", [primaryTag]).neq("id", item.id).order("created_at", {
          ascending: false
        }).limit(10); // Fetch a few more to filter if needed

        if (error) throw error;
        const rawItems = (data ?? []) as any[];
        const normalized: Item[] = rawItems.map(row => ({
          ...row,
          tags: row.tags ?? [],
          preview_image_url: row.preview_image_url ?? null,
          summary: row.summary ?? null,
          user_notes: row.user_notes ?? null,
          content: row.content ?? null,
          embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding ?? null
        }));
        const withSigned = await generateSignedUrlsForItems(normalized);
        setRelatedItems(withSigned);
      } catch (err) {
        console.error("Error fetching related items:", err);
        setRelatedItems([]);
      } finally {
        setLoadingRelated(false);
      }
    };
    fetchRelated();
  }, [open, itemId, tags]);
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
  const handleSave = useCallback(async (notesToSave: string, tagsToSave: string[], silent = false) => {
    if (!item) return;
    if (notesToSave.length > USER_NOTES_MAX_LENGTH) {
      toast.error(UPDATE_ERRORS.NOTES_TOO_LONG.title, {
        description: UPDATE_ERRORS.NOTES_TOO_LONG.message
      });
      return;
    }

    // Queue saves to prevent race conditions
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      if (!silent) setSaving(true);
      try {
        const {
          error
        } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
          user_notes: notesToSave,
          tags: tagsToSave
        }).eq("id", item.id);
        if (error) throw error;
        if (!silent) toast.success("Changes saved!");
        onUpdate();
      } catch (error: unknown) {
        const errorMessage = getUpdateErrorMessage(error);
        const typedError = toTypedError(error);
        console.error("Error saving:", typedError);
        if (!silent) toast.error(errorMessage.title, {
          description: errorMessage.message
        });
      } finally {
        if (!silent) setSaving(false);
      }
    });
    return saveQueueRef.current;
  }, [item, onUpdate]);

  // Keep ref in sync with handleSave for autosave useEffect
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Tag Handlers
  const normalizeTagInput = (tag: string) => tag.trim();
  const normalizeTagKey = (tag: string) => normalizeTagInput(tag).toLowerCase();
  const handleAddTag = () => {
    const trimmed = normalizeTagInput(newTagInput);
    if (!trimmed) {
      setNewTagInput("");
      setIsAddingTag(false);
      return;
    }
    const normalizedTrimmed = normalizeTagKey(trimmed);
    if (!tags.some(tag => normalizeTagKey(tag) === normalizedTrimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      handleSave(userNotes, newTags, true);
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };
  const handleRemoveTag = (tagToRemove: string) => {
    if (editingTagIndex !== null && tags[editingTagIndex] === tagToRemove) {
      handleCancelEditTag();
    }
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    handleSave(userNotes, newTags, true);
  };
  const handleStartEditTag = (tagIndex: number) => {
    setEditingTagIndex(tagIndex);
    setEditingTagValue(tags[tagIndex] ?? "");
  };
  const handleCancelEditTag = () => {
    setEditingTagIndex(null);
    setEditingTagValue("");
  };
  const handleCommitEditTag = () => {
    if (editingTagIndex === null) return;
    const trimmed = normalizeTagInput(editingTagValue);
    if (!trimmed) {
      handleCancelEditTag();
      return;
    }
    const normalizedTrimmed = normalizeTagKey(trimmed);
    const duplicateIndex = tags.findIndex((tag, index) => index !== editingTagIndex && normalizeTagKey(tag) === normalizedTrimmed);
    let newTags: string[] = [];
    if (duplicateIndex >= 0) {
      newTags = tags.filter((_, index) => index !== editingTagIndex);
      const adjustedIndex = duplicateIndex > editingTagIndex ? duplicateIndex - 1 : duplicateIndex;
      newTags[adjustedIndex] = trimmed;
    } else {
      newTags = tags.map((tag, index) => index === editingTagIndex ? trimmed : tag);
    }
    setTags(newTags);
    handleSave(userNotes, newTags, true);
    handleCancelEditTag();
  };
  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsAddingTag(false);
      setNewTagInput("");
    }
  };
  const handleKeyDownEditTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommitEditTag();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEditTag();
    }
  };
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
      console.error("Error deleting:", errorMessage);
      toast.error(errorMessage.title, {
        description: errorMessage.message
      });
    } finally {
      setDeleting(false);
    }
  }, [item, onOpenChange, onUpdate]);

  // Helpers
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

  // Type Detection
  const isVideoContent = item.type === 'video' || item.type === 'url' && item.content && isVideoUrl(item.content);
  const isDocumentContent = item.type === 'document' || item.type === 'file' || item.type === 'url' && item.content?.endsWith('.pdf');
  const isNoteContent = item.type === 'note';
  const isUrlContent = item.type === 'url';
  const isImageContent = item.type === 'image';

  // --- UNIFIED LAYOUT ---
  // Fixed sizing with 60/40 split for content/sidebar
  const modalSizeClasses = "w-[min(95vw,1100px)] max-w-[1100px] h-[min(85vh,720px)] overflow-hidden";
  const gridLayout = "grid-cols-1 lg:grid-cols-[1.4fr_1fr]";

  // 3. Preview Container Styling - Unified with scroll ownership and rounded corners
  const getPreviewContainerStyles = () => {
    // Base: unified container class + rounded corners + light gray background
    const base = "detail-preview-container relative rounded-2xl overflow-hidden";

    // Scroll ownership by content type
    if (isDocumentContent) {
      // PDF/Document cards: preview container is scrollable
      return `${base} detail-preview-scrollable bg-muted/20`;
    }

    // All other types: fixed/contained (no scroll)
    if (isVideoContent) {
      return `${base} detail-preview-fixed detail-preview-video`;
    }
    if (isNoteContent) {
      return `${base} detail-preview-fixed bg-muted/10 p-6`;
    }
    if (isImageContent) {
      return `${base} detail-preview-fixed detail-preview-letterbox bg-muted/20`;
    }
    if (isUrlContent) {
      return `${base} detail-preview-fixed bg-muted/15`;
    }
    return `${base} detail-preview-fixed bg-muted/15`;
  };
  const renderPreview = () => {
    if (!item) return null;
    if (item.type === 'note' && item.content) {
      return <div className="prose prose-sm dark:prose-invert max-w-none">
          <NotePreview content={item.content} variant="full" showProgress={false} />
        </div>;
    }
    if (item.type === 'url' && item.content) {
      if (isVideoUrl(item.content)) {
        return <div className="aspect-video w-full max-w-full">
            <VideoPreview url={item.content} title={item.title} className="w-full h-full rounded-2xl overflow-hidden" />
          </div>;
      }
      if (item.preview_image_url) {
        return <ThumbnailPreview imageUrl={item.preview_image_url} linkUrl={item.content} title={item.title} className="w-full h-full" variant="cover" />;
      }
    }
    if (item.type === 'image' && item.content) {
      return <div className="h-full flex items-center justify-center p-6">
          {loadingSignedUrl ? <LoadingSpinner size="sm" text="Loading image..." /> : signedUrl ? <img src={signedUrl} alt={item.title || "Image preview"} className="max-h-full max-w-full object-contain" /> : <div className="text-muted-foreground">Preview unavailable</div>}
        </div>;
    }
    if (item.content && item.type !== 'url' && item.type !== 'note' && item.type !== 'image') {
      return <div className="h-full flex flex-col min-h-0">
          {loadingSignedUrl ? <div className="h-full flex items-center justify-center">
              <LoadingSpinner size="sm" text="Loading file preview..." />
            </div> : signedUrl ? <div className="flex-1 min-h-0">
              {item.content?.toLowerCase().endsWith(".pdf") ? <PDFPreview url={signedUrl} className="h-full" /> : item.content?.toLowerCase().endsWith(".docx") ? <DOCXPreview url={signedUrl} className="h-full" /> : <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4 opacity-50" />
                  <p>Preview available in full view</p>
                </div>}
            </div> : <div className="h-full flex items-center justify-center text-muted-foreground">Preview unavailable</div>}
        </div>;
    }

    // Fallback
    return <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          {getIcon()}
        </div>
        <p>No preview available</p>
      </div>;
  };
  const MobileDetailContent = () => <div className="space-y-6 pb-20">
      {/* Simplified mobile view reuse logic but adapt styling */}
      <div className={`aspect-video w-full rounded-xl overflow-hidden relative ${isVideoContent ? "bg-black" : "bg-muted"}`}>
        {renderPreview()}
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-bold leading-tight">{item.title}</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true
          })}</span>
        </div>
      </div>

      {/* Mobile Tabs/Sections could go here, keeping it simple for now matching reference functionally */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
        <Textarea value={userNotes} onChange={e => setUserNotes(e.target.value)} placeholder="Add your notes here..." className="bg-muted/30 min-h-[120px]" />
      </div>

      {/* Mobile Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/95 backdrop-blur flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => handleSave(userNotes, tags)}><Save className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setShowDeleteAlert(true)}><Trash2 className="w-5 h-5" /></Button>
      </div>
    </div>;
  const DesktopDetailContent = () => <div className={`detail-modal-grid gap-0 ${gridLayout}`}>
      {/* LEFT COLUMN: Preview - scroll behavior controlled by content type */}
      <div className="detail-preview-column pr-6">
        <div className={`${getPreviewContainerStyles()} ${isVideoContent ? "" : "flex-1 min-h-0"}`}>
          {renderPreview()}
        </div>
      </div>

      {/* RIGHT COLUMN: Sidebar - Unified CardDetailRightPanel */}
      <CardDetailRightPanel item={item} userNotes={userNotes} onNotesChange={setUserNotes} tags={tags} isAddingTag={isAddingTag} newTagInput={newTagInput} editingTagIndex={editingTagIndex} editingTagValue={editingTagValue} onAddTagStart={() => setIsAddingTag(true)} onAddTagChange={setNewTagInput} onAddTagCommit={handleAddTag} onAddTagCancel={() => {
      setIsAddingTag(false);
      setNewTagInput("");
    }} onEditTagStart={handleStartEditTag} onEditTagChange={setEditingTagValue} onEditTagCommit={handleCommitEditTag} onEditTagCancel={handleCancelEditTag} onRemoveTag={handleRemoveTag} onCopyLink={() => {
      if (item.content) {
        navigator.clipboard.writeText(item.content);
        toast.success("Link copied to clipboard");
      }
    }} onDelete={() => setShowDeleteAlert(true)} saving={saving} tagInputRef={tagInputRef} editTagInputRef={editTagInputRef} />
    </div>;
  return <>
      {isMobile ? <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{item.title}</DrawerTitle>
              <DrawerDescription>Item details</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto">
              <MobileDetailContent />
            </div>
          </DrawerContent>
        </Drawer> : <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={`${modalSizeClasses} p-8 border-0 shadow-2xl bg-muted/20 backdrop-blur-md`}>
            <DialogHeader className="sr-only">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>Item details</DialogDescription>
            </DialogHeader>
            <DesktopDetailContent />
          </DialogContent>
        </Dialog>}

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};