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
const AUTO_SAVE_DELAY = 500;
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
          embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding ?? null,
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
    const trimmed = normalizeTagInput(editingTagValue);
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
  const isUrlContent = item.type === 'url';
  const isImageContent = item.type === 'image';

  // --- UNIFIED LAYOUT ---
  // Fixed sizing with 60/40 split for content/sidebar
  const modalSizeClasses = "w-[min(95vw,1100px)] max-w-[1100px] h-[min(85vh,720px)] overflow-hidden";
  const gridLayout = "grid-cols-1 lg:grid-cols-[1.4fr_1fr]";

  // 3. Preview Container Styling
  const getPreviewContainerStyles = () => {
    const base = "w-full h-full rounded-2xl overflow-hidden relative";
    if (isVideoContent) {
      return `${base} bg-black flex items-center justify-center`;
    }
    if (isDocumentContent) {
      return `${base} bg-muted/30 border border-border/40`;
    }
    if (isNoteContent) {
      return `${base} bg-card border border-border/40 p-6`;
    }
    if (isImageContent) {
      return `${base} bg-muted/30 border border-border/40 flex items-center justify-center`;
    }
    if (isUrlContent) {
      return `${base} bg-muted/20 border border-border/40`;
    }
    return `${base} bg-muted/20 border border-border/40 flex items-center justify-center`;
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
          placeholder="Add your notes here..."
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
    <div className={`grid h-full gap-0 ${gridLayout}`}>
      {/* LEFT COLUMN: Preview */}
      <div className="flex flex-col h-full overflow-hidden pr-6">
        <div className={getPreviewContainerStyles()}>
          {renderPreview()}
        </div>
      </div>

      {/* RIGHT COLUMN: Sidebar */}
      <div className="flex flex-col h-full max-h-full min-h-0 border-l border-border/40 pl-6 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto py-1 pr-2 space-y-6 scrollbar-thin">

          {/* HEADER */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground">{item.title}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
              {item.type === 'url' && item.content && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[180px]"
                  >
                    <Globe className="w-3 h-3" />
                    {(safeParseUrl(item.content)?.hostname ?? item.content)}
                  </a>
                </>
              )}
            </div>
          </div>

          {/* PRIMARY ACTIONS */}
          <div className="flex gap-2">
            {item.content && (
              <Button variant="default" size="sm" asChild className="h-8 flex-1">
                <a href={item.content} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Open</span>
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (item.content) {
                  navigator.clipboard.writeText(item.content);
                  toast.success("Link copied!");
                }
              }}
              className="h-8 flex-1"
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Copy</span>
            </Button>
          </div>

          {/* SUMMARY */}
          {item.summary && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Summary</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
            </div>
          )}

          {/* TAGS */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {isAddingTag ? (
                <div className="flex items-center h-6 bg-background border border-primary rounded-full px-2">
                  <Input
                    ref={tagInputRef}
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    onBlur={() => {
                      if (newTagInput.trim()) handleAddTag();
                      else setIsAddingTag(false);
                    }}
                    className="h-full border-0 p-0 text-xs w-16 focus-visible:ring-0 bg-transparent"
                    placeholder="Tag..."
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="h-6 px-2.5 flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-full transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add tag
                </button>
              )}
              {tags.map((tag, index) => (
                <div key={`${tag}-${index}`} className="group">
                  {editingTagIndex === index ? (
                    <div className="flex items-center h-6 bg-background border border-primary rounded-full px-2">
                      <Input
                        ref={editTagInputRef}
                        value={editingTagValue}
                        onChange={(e) => setEditingTagValue(e.target.value)}
                        onKeyDown={handleKeyDownEditTag}
                        onBlur={handleCancelEditTag}
                        className="h-full border-0 p-0 text-xs w-20 focus-visible:ring-0 bg-transparent"
                      />
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      onDoubleClick={() => handleStartEditTag(index)}
                      className="h-6 px-2.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted cursor-default flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* NOTES */}
          <div className="space-y-2 flex-1 flex flex-col">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Notes</span>
            <div className="relative flex-1">
              <Textarea
                ref={notesRef}
                placeholder="Add your notes..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                onBlur={() => {
                  const originalNotes = item?.user_notes ?? "";
                  if (userNotes !== originalNotes) {
                    handleSave(userNotes, tags, true);
                  }
                }}
                className="w-full min-h-[100px] resize-none border border-border/40 rounded-lg bg-muted/20 p-3 focus-visible:ring-1 text-sm leading-relaxed placeholder:text-muted-foreground/40"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/40">
                {saving ? "Saving..." : "Autosaved"}
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="py-4 flex items-center justify-end gap-2 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteAlert(true)}
            className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
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
