import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/shared/components/ui/drawer";
import { LoadingButton } from "@/shared/components/ui/loading-button";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { Trash2, Save } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { SUPABASE_ITEMS_TABLE } from "@/features/bookmarks/constants";
import type { Item } from "@/features/bookmarks/types";
interface NoteEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item;
  onUpdate: () => void;
}
export const NoteEditorModal = ({
  open,
  onOpenChange,
  item,
  onUpdate
}: NoteEditorModalProps) => {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const isMobile = useIsMobile();

  // Reset state when item changes
  useEffect(() => {
    if (item && open) {
      setTitle(item.title);
      setContent(item.content || "");
    }
  }, [item, open]);
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).update({
        title: title.trim(),
        content: content,
        updated_at: new Date().toISOString()
      }).eq("id", item.id);
      if (error) throw error;
      toast.success("Note saved!");
      onUpdate();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  }, [title, content, item.id, onUpdate]);
  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setShowDeleteAlert(false);
    try {
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).delete().eq("id", item.id);
      if (error) throw error;
      toast.success("Note deleted");
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    } finally {
      setDeleting(false);
    }
  }, [item.id, onOpenChange, onUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSave]);
  const editorContent = <div className="flex flex-col h-full gap-4">
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..." className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 px-[16px] py-[16px]" maxLength={200} />

      <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Start writing your note..." className="flex-1 min-h-[300px] resize-none border-0 bg-muted/30 rounded-xl p-4 focus-visible:ring-1 focus-visible:ring-primary/50" />

      <div className="flex gap-2 pt-3 border-t border-border/50">
        <LoadingButton onClick={handleSave} loading={saving} className="flex-1" aria-label="Save note">
          <Save className="h-4 w-4 mr-2" />
          Save
        </LoadingButton>
        <Button onClick={() => setShowDeleteAlert(true)} disabled={deleting} variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete note">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>;
  return <>
      {isMobile ? <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[95vh] pb-safe">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Edit Note</DrawerTitle>
              <DrawerDescription>Edit your note content</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {editorContent}
            </div>
          </DrawerContent>
        </Drawer> : <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="w-[600px] max-w-[90vw] h-[600px] max-h-[80vh] overflow-hidden border-0 glass-card p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>Edit your note content</DialogDescription>
            </DialogHeader>
            {editorContent}
          </DialogContent>
        </Dialog>}

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{item.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};