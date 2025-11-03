import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Link2, FileText, Image as ImageIcon, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import {
  CATEGORY_OPTIONS,
  DEFAULT_ITEM_TAG,
  SUPABASE_ITEMS_TABLE,
} from "@/constants";
import { generateSignedUrl } from "@/lib/supabase-utils";
import { formatError } from "@/lib/error-utils";
import { NetworkError, toTypedError } from "@/types/errors";
import { UPDATE_ERRORS, getUpdateErrorMessage } from "@/lib/error-messages";

import type { Item } from "@/types";

interface DetailViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onUpdate: () => void;
}

export const DetailViewModal = ({ open, onOpenChange, item, onUpdate }: DetailViewModalProps) => {
  const [userNotes, setUserNotes] = useState(item?.user_notes || "");
  const [selectedTag, setSelectedTag] = useState<string>(item?.tags?.[0] || DEFAULT_ITEM_TAG);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);

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
        toast.error('Unable to load PDF preview. The file may be unavailable.', { 
          description: 'PDF Load Failed' 
        });
      } finally {
        setLoadingSignedUrl(false);
      }
    };
    
    generateSignedUrlForItem();
  }, [item]);

  const handleSave = useCallback(async () => {
    if (!item) return;
    if (userNotes.length > 100000) {
      toast.error(UPDATE_ERRORS.NOTES_TOO_LONG.message, { 
        description: UPDATE_ERRORS.NOTES_TOO_LONG.title 
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
      setIsEditing(false);
      onUpdate();
    } catch (error: unknown) {
      const errorMessage = getUpdateErrorMessage(error);
      const typedError = toTypedError(error);
      const networkError = new NetworkError(
        errorMessage.message,
        typedError
      );
      
      console.error("Error saving:", networkError);
      toast.error(errorMessage.message, { description: errorMessage.title });
    } finally {
      setSaving(false);
    }
  }, [userNotes, selectedTag, item, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Item removed from your garden.");
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
      toast.error(errorMessage.message, { description: errorMessage.title });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto border-0 glass-card">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="text-primary opacity-60">{getIcon()}</div>
            <DialogTitle className="text-xl font-semibold">{item.title}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="sr-only">Detailed item view</DialogDescription>

        {/* HORIZONTAL LAYOUT */}
        <div className="flex flex-col md:flex-row gap-8 mt-4">
          {/* LEFT COLUMN */}
          <div className="md:w-1/3 flex flex-col gap-4">
            {(item.type === "document" || (item.content?.toLowerCase().includes(".pdf") ?? false)) && (
              <div className="rounded-xl overflow-hidden bg-muted">
                {loadingSignedUrl ? (
                  <div className="p-4 h-64 md:h-80 flex items-center justify-center">
                    <LoadingSpinner size="sm" text="Loading PDF preview..." />
                  </div>
                ) : signedUrl ? (
                  <iframe src={signedUrl} title="PDF preview" className="w-full h-64 md:h-80" />
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">PDF preview unavailable</div>
                )}
                {signedUrl && !loadingSignedUrl && (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline px-3 py-2">
                    Open full PDF
                  </a>
                )}
              </div>
            )}
            {item.preview_image_url && (
              <img
                src={item.preview_image_url}
                alt={item.title}
                className="rounded-xl shadow-md object-cover w-full h-auto"
              />
            )}

            {item.type === "url" && (
              <a
                href={item.content ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                <Link2 className="h-4 w-4" />
                Visit Link
              </a>
            )}

            {/* Category Tag Section */}
            <div>
              <label htmlFor="category-select" className="font-semibold text-sm text-muted-foreground mb-2 block">Category</label>
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
          </div>

          {/* RIGHT COLUMN */}
          <div className="md:flex-1 flex flex-col gap-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Summary</h3>
              <p className="text-[15px] leading-relaxed">{item.summary}</p>
            </div>

            {/* Notes Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Personal Notes</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-8 text-xs font-medium hover:bg-accent"
                  aria-label={isEditing ? "Preview notes" : "Edit notes"}
                >
                  {isEditing ? "Preview" : "Edit"}
                </Button>
              </div>

              {isEditing ? (
                <div>
                  <label htmlFor="user-notes-textarea" className="sr-only">Personal notes in markdown format</label>
                  <Textarea
                    id="user-notes-textarea"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Add your personal notes in markdown..."
                    maxLength={100000}
                    className="glass-input border-0 min-h-[150px] text-[15px] resize-none"
                    aria-describedby="notes-helper-text"
                  />
                  <p id="notes-helper-text" className="sr-only">You can use markdown formatting in your notes</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none glass-card p-4 rounded-xl text-[15px]" role="region" aria-label="Note preview">
                  {userNotes ? (
                    <ReactMarkdown>{userNotes}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">No personal notes yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-primary hover:bg-primary/90 h-11 font-medium transition-all"
                aria-label="Save changes (Ctrl+S or Cmd+S)"
              >
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="outline"
                className="h-11 border-destructive/20 text-destructive hover:bg-destructive/10 font-medium transition-all"
                aria-label="Delete item (Ctrl+D or Cmd+D)"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
