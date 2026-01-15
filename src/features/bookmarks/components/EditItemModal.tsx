import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { SUPABASE_ITEMS_TABLE } from "@/constants";
import type { Item } from "@/types";

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item;
  onItemUpdated: () => void;
}

export const EditItemModal = ({ open, onOpenChange, item, onItemUpdated }: EditItemModalProps) => {
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  // Reset form when item changes
  useEffect(() => {
    if (open) {
      setTitle(item.title);
      setSummary(item.summary || "");
      setTags(item.tags || []);
      setTagInput("");
    }
  }, [item, open]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .update({
          title: title.trim(),
          summary: summary.trim() || null,
          tags: tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success("Item updated successfully! ✨");
      onOpenChange(false);
      onItemUpdated();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error("Failed to update item", {
        description: "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  // Shared form content
  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Title
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title..."
          className="glass-input border-0 h-12 md:h-10 min-h-[44px]"
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary" className="text-sm font-medium">
          Summary
        </Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Enter summary..."
          className="glass-input border-0 min-h-[100px] resize-none"
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags" className="text-sm font-medium">
          Tags
        </Label>
        <Input
          id="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Type and press Enter to add tags..."
          className="glass-input border-0 h-12 md:h-10 min-h-[44px]"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs font-semibold shadow-sm flex items-center gap-1 pr-1 min-h-[32px]"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-1 premium-transition min-h-[24px] min-w-[24px]"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <LoadingButton
        type="submit"
        loading={loading}
        loadingText="Updating..."
        size="lg"
        className="w-full min-h-[48px]"
      >
        Update Item
      </LoadingButton>
    </form>
  );

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] pb-safe">
        <DrawerHeader>
          <DrawerTitle className="text-xl font-semibold text-foreground">
            Edit Item
          </DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            Update the title, summary, or tags for this item
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <FormContent />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Edit Item
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update the title, summary, or tags for this item
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
};
