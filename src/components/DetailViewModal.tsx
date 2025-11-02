import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  content: z.string().nullable(),
  summary: z.string().nullable(),
  user_notes: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  preview_image_url: z.string().nullable(),
});

type Item = z.infer<typeof itemSchema>;
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

  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateSignedUrlForItem = async () => {
      if (!item?.content) {
        setSignedUrl(null);
        return;
      }
      
      const url = await generateSignedUrl(item.content);
      setSignedUrl(url);
    };
    
    generateSignedUrlForItem();
  }, [item]);

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

  const handleSave = async () => {
    if (userNotes.length > 100000) {
      toast.error("Notes are too long (max 100,000 characters)");
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
    } catch (error) {
      console.error("Error saving:", error);
      const message = formatError(error, "Failed to save changes.");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Item removed from your garden.");
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting:", error);
      const message = formatError(error, "Failed to delete item.");
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

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
                {signedUrl ? (
                  <iframe src={signedUrl} title="PDF preview" className="w-full h-64 md:h-80" />
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">PDF preview unavailable</div>
                )}
                {signedUrl && (
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
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Category</h3>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                >
                  {isEditing ? "Preview" : "Edit"}
                </Button>
              </div>

              {isEditing ? (
                <Textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Add your personal notes in markdown..."
                  maxLength={100000}
                  className="glass-input border-0 min-h-[150px] text-[15px] resize-none"
                />
              ) : (
                <div className="prose prose-sm max-w-none glass-card p-4 rounded-xl text-[15px]">
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
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="outline"
                className="h-11 border-destructive/20 text-destructive hover:bg-destructive/10 font-medium transition-all"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
