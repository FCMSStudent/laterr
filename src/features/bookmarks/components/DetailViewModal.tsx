import { useState, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/ui";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/ui";
import { Button } from "@/ui";
import { LoadingButton } from "@/ui";
import { LoadingSpinner } from "@/ui";

import { PDFPreview } from "@/features/bookmarks/components/PDFPreview";
import { DOCXPreview } from "@/features/bookmarks/components/DOCXPreview";
import { VideoPreview } from "@/features/bookmarks/components/VideoPreview";
import { ThumbnailPreview } from "@/features/bookmarks/components/ThumbnailPreview";
import { NotePreview } from "@/features/bookmarks/components/NotePreview";
import { ItemCard } from "@/features/bookmarks/components/ItemCard";
import { Link2, FileText, Image as ImageIcon, Trash2, Save, ExternalLink, Plus, Share2, Circle, Globe, CheckCircle2, Clock, X, Edit2 } from "lucide-react";
import { Badge } from "@/ui";
import { Input, Textarea } from "@/ui";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { CATEGORY_OPTIONS, DEFAULT_ITEM_TAG, SUPABASE_ITEMS_TABLE } from "@/features/bookmarks/constants";
import { generateSignedUrl, generateSignedUrlsForItems } from "@/shared/lib/supabase-utils";
import { NetworkError, toTypedError } from "@/shared/types/errors";
import { UPDATE_ERRORS, getUpdateErrorMessage, ITEM_ERRORS } from "@/shared/lib/error-messages";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import type { Item } from "@/features/bookmarks/types";
import { useDebounce } from "@/shared/hooks/use-debounce";

// Constants
const USER_NOTES_MAX_LENGTH = 10000;
const AUTO_SAVE_DELAY = 500;

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

  const notesRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const editTagInputRef = useRef<HTMLInputElement>(null);

  // Focus tag input when adding
  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  useEffect(() => {
    if (editingTagIndex !== null && editTagInputRef.current) {
      editTagInputRef.current.focus();
      editTagInputRef.current.select();
    }
  }, [editingTagIndex]);

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setUserNotes(item.user_notes || "");
      setTags(item.tags || []);
      setIsAddingTag(false);
      setNewTagInput("");
      setEditingTagIndex(null);
      setEditingTagValue("");
    }
  }, [item]);

  // Autosave notes
  useEffect(() => {
    if (!item || !open) return;
    if (debouncedNotes !== (item.user_notes || "")) {
      handleSave(debouncedNotes, tags, true);
    }
  }, [debouncedNotes]);

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
        const { data, error } = await supabase
          .from(SUPABASE_ITEMS_TABLE)
          .select("*")
          .contains("tags", [primaryTag])
          .neq("id", item.id)
          .order("created_at", { ascending: false })
          .limit(10); // Fetch a few more to filter if needed

        if (error) throw error;

        const rawItems = (data ?? []) as any[];
        const normalized: Item[] = rawItems.map((row) => ({
          ...row,
          tags: row.tags ?? [],
          preview_image_url: row.preview_image_url ?? null,
          summary: row.summary ?? null,
          user_notes: row.user_notes ?? null,
          content: row.content ?? null,
          embedding: row.embedding ? JSON.parse(row.embedding) : null,
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
  }, [open, item?.id]); // Depend on item.id to refetch when item changes. Removed 'tags' to avoid loop, technically related items could change if tags change, but for now let's keep it stable on item open.

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

    if (!silent) setSaving(true);
    try {
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
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
      if (!silent) toast.error(errorMessage.title, { description: errorMessage.message });
    } finally {
      if (!silent) setSaving(false);
    }
  }, [item, onUpdate]);

  // Tag Handlers
  const normalizeTag = (tag: string) => tag.trim();
  const normalizeTagKey = (tag: string) => normalizeTag(tag).toLowerCase();

  const handleAddTag = () => {
    const trimmed = normalizeTag(newTagInput);
    if (!trimmed) {
      setNewTagInput("");
      setIsAddingTag(false);
      return;
    }

    const normalizedTrimmed = normalizeTagKey(trimmed);
    if (!tags.some((tag) => normalizeTagKey(tag) === normalizedTrimmed)) {
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
    const trimmed = normalizeTag(editingTagValue);
    if (!trimmed) {
      handleCancelEditTag();
      return;
    }

    const normalizedTrimmed = normalizeTagKey(trimmed);
    const duplicateIndex = tags.findIndex(
      (tag, index) => index !== editingTagIndex && normalizeTagKey(tag) === normalizedTrimmed
    );

    let newTags: string[] = [];
    if (duplicateIndex >= 0) {
      newTags = tags.filter((_, index) => index !== editingTagIndex);
      const adjustedIndex = duplicateIndex > editingTagIndex ? duplicateIndex - 1 : duplicateIndex;
      newTags[adjustedIndex] = trimmed;
    } else {
      newTags = tags.map((tag, index) => (index === editingTagIndex ? trimmed : tag));
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
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Item removed from your space.");
      onOpenChange(false);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = getUpdateErrorMessage(error);
      console.error("Error deleting:", errorMessage);
      toast.error(errorMessage.title, { description: errorMessage.message });
    } finally {
      setDeleting(false);
    }
  }, [item, onOpenChange, onUpdate]);

  // Helpers
  const getIcon = useCallback(() => {
    if (!item) return null;
    switch (item.type) {
      case "url": return <Link2 className="h-5 w-5" />;
      case "note":
      case "document":
      case "file": return <FileText className="h-5 w-5" />;
      case "image": return <ImageIcon className="h-5 w-5" />;
      default: return null;
    }
  }, [item]);

  if (!item) return null;

  // Type Detection
  const isVideoContent = item.type === 'video' || (item.type === 'url' && item.content && isVideoUrl(item.content));
  const isDocumentContent = item.type === 'document' || item.type === 'file' || (item.type === 'url' && item.content?.endsWith('.pdf'));
  const isNoteContent = item.type === 'note';

  // --- LAYOUT LOGIC UPGRADE ---

  // 1. Size Classes: responsive clamp-like sizing
  const modalSizeClasses = "w-[min(95vw,1400px)] h-[clamp(70vh,80vh,85vh)] min-h-[600px]";

  // 2. Grid Layout Ratios
  const getGridLayout = () => {
    // Base: Mobile 1 col, Desktop split
    // Video: Maximize left col, standard sidebar
    // Doc/Note: Standard split
    if (isVideoContent) {
      return "grid-cols-1 lg:grid-cols-[1fr_0.6fr] xl:grid-cols-[1fr_0.55fr]";
    }
    if (isDocumentContent) {
      return "grid-cols-1 lg:grid-cols-[1fr_0.7fr] xl:grid-cols-[1fr_0.65fr]";
    }
    if (isNoteContent || isUrlContent || isImageContent) {
      return "grid-cols-1 lg:grid-cols-[1fr_0.65fr] xl:grid-cols-[1fr_0.6fr]";
    }
    return "grid-cols-1 lg:grid-cols-[1fr_0.7fr] xl:grid-cols-[1fr_0.65fr]";
  };

  // 3. Preview Container Styling
  const getPreviewContainerStyles = () => {
    const base = "w-full rounded-2xl overflow-hidden relative";
    if (isVideoContent) {
      return `${base} aspect-video bg-black flex items-center justify-center overflow-hidden`;
    }
    if (isDocumentContent) {
      return `${base} h-[60vh] lg:h-full bg-muted/30 border border-border/40`;
    }
    if (isNoteContent) {
      return `${base} min-h-[300px] bg-card border border-border/40 p-6`;
    }
    if (isImageContent) {
      return `${base} min-h-[400px] bg-muted/30 border border-border/40 flex items-center justify-center`;
    }
    if (isUrlContent) {
      return `${base} min-h-[360px] bg-muted/20 border border-border/40`;
    }
    return `${base} min-h-[400px] bg-muted/20 border border-border/40 flex items-center justify-center`;
  };

  const renderPreview = () => {
    if (!item) return null;

    if (item.type === 'note' && item.content) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <NotePreview content={item.content} variant="full" showProgress={false} />
        </div>
      );
    }

    if (item.type === 'url' && item.content) {
      if (isVideoUrl(item.content)) {
        return <VideoPreview url={item.content} title={item.title} className="w-full h-full" />;
      }
      if (item.preview_image_url) {
        return (
          <ThumbnailPreview
            imageUrl={item.preview_image_url}
            linkUrl={item.content}
            title={item.title}
            className="w-full h-full"
            variant="cover"
          />
        );
      }
    }

    if (item.type === 'image' && item.content) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          {loadingSignedUrl ? (
            <LoadingSpinner size="sm" text="Loading image..." />
          ) : signedUrl ? (
            <img
              src={signedUrl}
              alt={item.title || "Image preview"}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground">Preview unavailable</div>
          )}
        </div>
      );
    }

    if (item.content && item.type !== 'url' && item.type !== 'note' && item.type !== 'image') {
      return (
        <div className="h-full flex flex-col">
          {loadingSignedUrl ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner size="sm" text="Loading file preview..." />
            </div>
          ) : signedUrl ? (
            <>
              {item.content?.toLowerCase().endsWith(".pdf") ? (
                <PDFPreview url={signedUrl} className="h-full overflow-y-auto" />
              ) : item.content?.toLowerCase().endsWith(".docx") ? (
                <DOCXPreview url={signedUrl} className="h-full overflow-y-auto" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4 opacity-50" />
                  <p>Preview available in full view</p>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Preview unavailable</div>
          )}

          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 text-xs font-medium bg-background/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm hover:bg-background transition-colors border border-border/50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Original
            </a>
          )}
        </div>
      );
    }

    // Fallback
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          {getIcon()}
        </div>
        <p>No preview available</p>
      </div>
    );
  };

  const MobileDetailContent = () => (
    <div className="space-y-6 pb-20">
      {/* Simplified mobile view reuse logic but adapt styling */}
      <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden relative">
        {renderPreview()}
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-bold leading-tight">{item.title}</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Mobile Tabs/Sections could go here, keeping it simple for now matching reference functionally */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
        <Textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          onBlur={() => {
            const originalNotes = item?.user_notes ?? "";
            if (userNotes !== originalNotes) {
              handleSave(userNotes, tags, true);
            }
          }}
          placeholder="Add your notes..."
          className="bg-muted/30 min-h-[120px]"
        />
      </div>

      {/* Mobile Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/95 backdrop-blur flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => handleSave(userNotes, tags)}><Save className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setShowDeleteAlert(true)}><Trash2 className="w-5 h-5" /></Button>
      </div>
    </div>
  );

  const DesktopDetailContent = () => (
    <div className={`grid h-full gap-8 ${getGridLayout()}`}>
      {/* LEFT COLUMN: Preview + Related Items */}
      <div className="flex flex-col min-h-0 gap-8 hide-scrollbar overflow-y-auto pr-2">
        {/* Main Preview */}
        <div className={getPreviewContainerStyles()}>
          {renderPreview()}
        </div>

        {/* Related Items (Hidden for Video) */}
        {!isVideoContent && relatedItems.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-semibold tracking-tight">Related to this</h3>
            <div className={`grid gap-4 ${isDocumentContent ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 masonry-grid'}`}>
              {relatedItems.slice(0, isDocumentContent ? 4 : 6).map((related) => (
                <ItemCard
                  key={related.id}
                  {...related}
                  onClick={() => {
                    // ItemCard might need local handling or it just works if using a global store/router
                    // For now assuming it opens separately, ideally we switch content here
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Sidebar */}
      <div className="flex flex-col h-full min-h-0 bg-muted/30 border border-t-0 border-r-0 border-b-0 border-l border-border/50 -my-6 py-6 pl-6">
        <div className="flex-1 overflow-y-auto pr-2 space-y-8 scrollbar-thin">

          {/* HEADER */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold leading-snug tracking-tight text-foreground">{item.title}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
              {item.type === 'url' && item.content && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[200px]"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {new URL(item.content).hostname}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* SUMMARY CARD */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold tracking-widest uppercase ${isVideoContent ? 'text-orange-500' : 'text-blue-500'}`}>
                {isVideoContent ? 'TLDW' : 'TLDR'}
              </span>
            </div>
            <div className="p-4 rounded-xl border border-border/60 bg-background/50 text-sm leading-relaxed text-muted-foreground shadow-sm">
              {item.summary ? (
                item.summary
              ) : (
                <span className="text-muted-foreground/60 italic">No summary yet</span>
              )}
            </div>
          </div>

          {/* TAGS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Mind Tags</span>
              {/* Small icon if needed */}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Add Tag Button */}
              {isAddingTag ? (
                <div className="flex items-center h-7 bg-background border border-primary rounded-full px-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <Input
                    ref={tagInputRef}
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    onBlur={() => {
                      if (newTagInput.trim()) handleAddTag();
                      else setIsAddingTag(false);
                    }}
                    className="h-full border-0 p-0 text-xs w-20 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
                    placeholder="Tag name..."
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="h-7 px-3 flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-full transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add tag
                </button>
              )}

              {/* Tag List */}
              {tags.map((tag, index) => (
                <div key={`${tag}-${index}`} className="group relative">
                  {editingTagIndex === index ? (
                    <div className="flex items-center h-7 bg-background border border-primary rounded-full px-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                      <Input
                        ref={editTagInputRef}
                        value={editingTagValue}
                        onChange={(e) => setEditingTagValue(e.target.value)}
                        onKeyDown={handleKeyDownEditTag}
                        onBlur={handleCancelEditTag}
                        className="h-full border-0 p-0 text-xs w-24 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
                        placeholder="Edit tag..."
                      />
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      onDoubleClick={() => handleStartEditTag(index)}
                      className="h-7 px-3 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted border border-transparent hover:border-border/50 transition-all cursor-default flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditTag(index);
                        }}
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-background/80 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                        title="Edit tag"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-background/80 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all -mr-1"
                        title="Remove tag"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* NOTES SECTION */}
          <div className="space-y-3 flex-1 flex flex-col min-h-[150px]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Mind Notes</span>
            </div>
            <div className="relative flex-1">
              <Textarea
                ref={notesRef}
                placeholder="Type here to add a note..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                onBlur={() => {
                  const originalNotes = item?.user_notes ?? "";
                  if (userNotes !== originalNotes) {
                    handleSave(userNotes, tags, true);
                  }
                }}
                className="w-full h-full min-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm leading-relaxed placeholder:text-muted-foreground/40 -ml-1 pl-1"
              />
              {/* Optional: autosave indicator */}
              <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground/50 transition-opacity duration-500">
                {saving ? "Saving..." : "Autosaved"}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="pt-4 mt-auto flex items-center justify-center gap-6 border-t border-border/40">
          <button
            onClick={() => handleSave(userNotes, tags)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Save Manually"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (item.content) {
                navigator.clipboard.writeText(item.content);
                toast.success("Copied to clipboard");
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Share / Copy Link"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDeleteAlert(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete Item"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{item.title}</DrawerTitle>
              <DrawerDescription>Item details</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto">
              <MobileDetailContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={`${modalSizeClasses} p-8 border-0 shadow-2xl bg-background/80 backdrop-blur-md`}>
            <DialogHeader className="sr-only">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>Item details</DialogDescription>
            </DialogHeader>
            <DesktopDetailContent />
          </DialogContent>
        </Dialog>
      )}

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
    </>
  );
};
