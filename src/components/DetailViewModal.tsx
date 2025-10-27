import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link2, FileText, Image as ImageIcon, Trash2, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

interface DetailViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  onUpdate: () => void;
}

export const DetailViewModal = ({ open, onOpenChange, item, onUpdate }: DetailViewModalProps) => {
  const [userNotes, setUserNotes] = useState(item?.user_notes || "");
  const [tags, setTags] = useState<string[]>(item?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!item) return null;

  const getIcon = () => {
    switch (item.type) {
      case 'url': return <Link2 className="h-5 w-5" />;
      case 'note': return <FileText className="h-5 w-5" />;
      case 'image': return <ImageIcon className="h-5 w-5" />;
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ 
          user_notes: userNotes,
          tags: tags
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success("Changes saved!");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Failed to save changes.");
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast.success("Item removed from your garden.");
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error("Failed to delete item.");
    }
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleGenerateIcon = async (tag: string) => {
    setGenerating(true);
    try {
      const prompt = `a simple, minimalist icon representing "${tag}"`;
      const { data, error } = await supabase.functions.invoke('generate-tag-icon', {
        body: { tagName: tag, prompt }
      });

      if (error) throw error;

      // Save to database
      const { error: insertError } = await supabase
        .from('tag_icons')
        .upsert({
          tag_name: tag,
          icon_url: data.iconUrl
        });

      if (insertError) throw insertError;

      toast.success(`Custom icon generated for #${tag}!`);
    } catch (error) {
      console.error('Error generating icon:', error);
      toast.error("Failed to generate icon.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glass-card border-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="text-primary opacity-60">{getIcon()}</div>
            <DialogTitle className="text-xl font-semibold">{item.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {item.preview_image_url && (
            <img 
              src={item.preview_image_url} 
              alt={item.title}
              className="w-full rounded-xl shadow-md"
            />
          )}

          {item.type === 'url' && (
            <a 
              href={item.content} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-2 smooth-transition"
            >
              <Link2 className="h-4 w-4" />
              Visit Link
            </a>
          )}

          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Summary</h3>
            <p className="text-[15px] leading-relaxed">{item.summary}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Personal Notes</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 text-xs font-medium hover:bg-accent smooth-transition"
              >
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
            </div>
            {isEditing ? (
              <Textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Add your personal notes in markdown..."
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

          <div>
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Badge variant="secondary" className="cursor-default text-xs font-medium">
                    #{tag}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10 smooth-transition"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <span className="text-xs text-muted-foreground hover:text-destructive">×</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-accent smooth-transition"
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
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="glass-input border-0 h-10 text-[15px]"
              />
              <Button onClick={handleAddTag} variant="secondary" className="h-10 font-medium">
                Add
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <Button 
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary/90 h-11 smooth-transition font-medium"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              onClick={handleDelete}
              variant="outline"
              className="h-11 border-destructive/20 text-destructive hover:bg-destructive/10 smooth-transition font-medium"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};