import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link2, FileText, Image as ImageIcon, Trash2, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { z } from "zod";

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["url", "note", "image"]),
  content: z.string().nullable(),
  summary: z.string().nullable(),
  user_notes: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  preview_image_url: z.string().nullable(),
});

type Item = z.infer<typeof itemSchema>;

interface DetailViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onUpdate: () => void;
}

const tagSchema = z.string().regex(/^[a-zA-Z0-9-_ ]+$/, "Invalid characters").max(50, "Tag too long");

export const DetailViewModal = ({ open, onOpenChange, item, onUpdate }: DetailViewModalProps) => {
  const [userNotes, setUserNotes] = useState(item?.user_notes || "");
  const [tags, setTags] = useState<string[]>(item?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const getIcon = useCallback(() => {
    switch (item.type) {
      case "url": return <Link2 className="h-5 w-5" />;
      case "note": return <FileText className="h-5 w-5" />;
      case "image": return <ImageIcon className="h-5 w-5" />;
      default: return null;
    }
  }, [item.type]);

  const handleSave = async () => {
    if (userNotes.length > 100000) {
      toast.error("Notes are too long (max 100,000 characters)");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("items")
        .update({ user_notes: userNotes, tags })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Changes saved!");
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Item removed from your garden.");
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Failed to delete item.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;

    const tagResult = tagSchema.safeParse(trimmedTag);
    if (!tagResult.success) {
      toast.error(tagResult.error.errors[0].message);
      return;
    }

    if (tags.includes(trimmedTag)) {
      toast.error("Tag already exists");
      return;
    }

    if (tags.length >= 20) {
      toast.error("Maximum 20 tags allowed");
      return;
    }

    setTags([...tags, trimmedTag]);
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleGenerateIcon = async (tag: string) => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const prompt = `a simple, minimalist icon representing "${tag}"`;
      const { data, error } = await supabase.functions.invoke("generate-tag-icon", {
        body: { tagName: tag, prompt },
      });

      if (error) throw error;

      const { error: insertError } = await supabase.from("tag_icons").upsert({
        tag_name: tag,
        icon_url: data.iconUrl,
        user_id: user.id,
      });

      if (insertError) throw insertError;

      toast.success(`Custom icon generated for #${tag}!`);
    } catch (error: any) {
      console.error("Error generating icon:", error);
      toast.error(error.message || "Failed to generate icon.");
    } finally {
      setGenerating(false);
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

        {/* HORIZONTAL LAYOUT */}
        <div className="flex flex-col md:flex-row gap-8 mt-4">
          {/* LEFT COLUMN */}
          <div className="md:w-1/3 flex flex-col gap-4">
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

            {/* Tags Section */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <div key={tag} className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs font-medium">#{tag}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <span className="text-xs text-muted-foreground hover:text-destructive">×</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-accent"
                      onClick={() => handleGenerateIcon(tag)}
                      disabled={generating}
                      title="Generate custom icon"
                    >
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add new tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  maxLength={50}
                  className="glass-input border-0 h-10 text-[15px]"
                />
                <Button onClick={handleAddTag} variant="secondary" className="h-10 font-medium">
                  Add
                </Button>
              </div>
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
