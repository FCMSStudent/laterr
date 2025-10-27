import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, FileText, Image, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: () => void;
}

export const AddItemModal = ({ open, onOpenChange, onItemAdded }: AddItemModalProps) => {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUrlSubmit = async () => {
    if (!url) return;
    
    setLoading(true);
    try {
      // Call edge function to analyze URL
      const { data, error } = await supabase.functions.invoke('analyze-url', {
        body: { url }
      });

      if (error) throw error;

      // Insert into database
      const { error: insertError } = await supabase
        .from('items')
        .insert({
          type: 'url',
          title: data.title,
          content: url,
          summary: data.summary,
          tags: data.tags,
          preview_image_url: data.previewImageUrl
        });

      if (insertError) throw insertError;

      toast.success("URL added to your garden! 🌱");
      setUrl("");
      onOpenChange(false);
      onItemAdded();
    } catch (error) {
      console.error('Error adding URL:', error);
      toast.error("Failed to add URL. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNoteSubmit = async () => {
    if (!note) return;
    
    setLoading(true);
    try {
      const firstLine = note.split('\n')[0].substring(0, 100);
      
      const { error } = await supabase
        .from('items')
        .insert({
          type: 'note',
          title: firstLine || 'Untitled Note',
          content: note,
          summary: note.substring(0, 200),
          tags: ['note']
        });

      if (error) throw error;

      toast.success("Note planted in your garden! 📝");
      setNote("");
      onOpenChange(false);
      onItemAdded();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error("Failed to add note. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(fileName);

      // Analyze with AI
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { imageUrl: publicUrl }
      });

      if (error) throw error;

      // Insert into database
      const { error: insertError } = await supabase
        .from('items')
        .insert({
          type: 'image',
          title: data.title,
          content: publicUrl,
          summary: data.description,
          tags: data.tags,
          preview_image_url: publicUrl
        });

      if (insertError) throw insertError;

      toast.success("Image added to your garden! 🖼️");
      setFile(null);
      onOpenChange(false);
      onItemAdded();
    } catch (error) {
      console.error('Error adding image:', error);
      toast.error("Failed to add image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Plant Something New
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-card">
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-2">
              <FileText className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2">
              <Image className="h-4 w-4" />
              Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <Input
              placeholder="Paste a URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="glass-input"
            />
            <Button 
              onClick={handleUrlSubmit} 
              disabled={!url || loading}
              className="w-full bg-gradient-to-r from-primary to-accent"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add URL"}
            </Button>
          </TabsContent>

          <TabsContent value="note" className="space-y-4 mt-4">
            <Textarea
              placeholder="Write your thoughts..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="glass-input min-h-[150px]"
            />
            <Button 
              onClick={handleNoteSubmit}
              disabled={!note || loading}
              className="w-full bg-gradient-to-r from-primary to-accent"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Note"}
            </Button>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-4">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="glass-input"
            />
            <Button 
              onClick={handleFileSubmit}
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-primary to-accent"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Image"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};