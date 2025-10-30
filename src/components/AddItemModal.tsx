import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, FileText, File, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: () => void;
}

const urlSchema = z.string().url('Invalid URL').max(2048, 'URL too long');
const noteSchema = z.string().min(1, 'Note cannot be empty').max(100000, 'Note too long');

export const AddItemModal = ({ open, onOpenChange, onItemAdded }: AddItemModalProps) => {
  const [url, setUrl] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState<string>("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string | null>(null);

  const handleUrlSubmit = async () => {
    // Validate URL
    const urlResult = urlSchema.safeParse(url.trim());
    if (!urlResult.success) {
      toast.error(urlResult.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    setStatusStep('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('analyze-url', {
        body: { url: urlResult.data }
      });

      if (error) throw error;

      // Set suggested category from AI
      if (data.tags && data.tags.length > 0) {
        setSuggestedCategory(data.tags[0]);
      }

      const { error: insertError } = await supabase
        .from('items')
        .insert({
          type: 'url',
          title: data.title,
          content: urlResult.data,
          summary: data.summary,
          tags: suggestedCategory ? [suggestedCategory] : (data.tags || ['read later']),
          preview_image_url: data.previewImageUrl,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      toast.success("URL added to your garden! 🌱");
      setUrl("");
      setSuggestedCategory("");
      onOpenChange(false);
      onItemAdded();
    } catch (error: any) {
      console.error('Error adding URL:', error);
      toast.error(error.message || "Failed to add URL. Please try again.");
    } finally {
      setLoading(false);
      setStatusStep(null);
    }
  };

  const handleNoteSubmit = async () => {
    // Validate note
    const noteResult = noteSchema.safeParse(note.trim());
    if (!noteResult.success) {
      toast.error(noteResult.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    setStatusStep('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const firstLine = noteResult.data.split('\n')[0].substring(0, 100);
      
      const { error } = await supabase
        .from('items')
        .insert({
          type: 'note',
          title: firstLine || 'Untitled Note',
          content: noteResult.data,
          summary: noteResult.data.substring(0, 200),
          tags: ['note'],
          user_id: user.id,
        });

      if (error) throw error;

      toast.success("Note planted in your garden! 📝");
      setNote("");
      onOpenChange(false);
      onItemAdded();
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error.message || "Failed to add note. Please try again.");
    } finally {
      setLoading(false);
      setStatusStep(null);
    }
  };

  const handleFileSubmit = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    // Validate file type - now accepting images, PDFs, and Word documents
    const validTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Only images, PDFs, and Word documents are allowed');
      return;
    }

    // Validate file size (20MB max for documents)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File is too large (max 20MB)');
      return;
    }
    
    setLoading(true);
    setStatusStep('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage with user-specific path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setStatusStep('extracting');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(fileName);

      // Analyze with AI - using the new analyze-file function
      const { data, error } = await supabase.functions.invoke('analyze-file', {
        body: {
          fileUrl: publicUrl,
          fileType: file.type,
          fileName: file.name
        }
      });

      if (error) throw error;

      setStatusStep('summarizing');

      // Determine item type based on file type
      let itemType = 'file';
      if (file.type.startsWith('image/')) {
        itemType = 'image';
      } else if (file.type === 'application/pdf') {
        itemType = 'document';
      } else if (file.type.includes('word')) {
        itemType = 'document';
      }

      // Insert into database
      setStatusStep('saving');

      const { error: insertError } = await supabase
        .from('items')
        .insert({
          type: itemType,
          title: data.title,
          content: publicUrl,
          summary: data.description + (data.extractedText ? `\n\nExtracted text: ${data.extractedText}` : ''),
          tags: data.tags,
          preview_image_url: file.type.startsWith('image/') ? publicUrl : null,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      const fileTypeLabel = file.type.startsWith('image/') ? 'Image' :
                           file.type === 'application/pdf' ? 'PDF' : 'Document';
      toast.success(`${fileTypeLabel} added to your garden! 📁`);
      setFile(null);
      onOpenChange(false);
      onItemAdded();
    } catch (error: any) {
      console.error('Error adding file:', error);
      if (error.message?.includes('Rate limit')) {
        toast.error('AI rate limit hit. Please wait a moment and try again.');
      } else if (error.message?.includes('credits')) {
        toast.error('AI credits exhausted. Please top up to continue.');
      } else {
        toast.error(error.message || "Failed to add file. Please try again.");
      }
    } finally {
      setLoading(false);
      setStatusStep(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-0">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Add New Item
          </DialogTitle>
        </DialogHeader>

        {loading && suggestedCategory && (
          <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Confirm category:</p>
            <div className="flex gap-2 flex-wrap">
              {['watch later', 'read later', 'wish list', 'work on'].map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={suggestedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSuggestedCategory(category)}
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-card border-0">
            <TabsTrigger value="url" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white smooth-transition">
              <Link2 className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white smooth-transition">
              <FileText className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white smooth-transition">
              <File className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-6">
            <Input
              placeholder="Paste a URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={2048}
              className="glass-input border-0 h-11 text-[15px]"
            />
            <Button 
              onClick={handleUrlSubmit} 
              disabled={!url || loading}
              className="w-full bg-primary hover:bg-primary/90 h-11 smooth-transition font-medium"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add URL"}
            </Button>
          </TabsContent>

          <TabsContent value="note" className="space-y-4 mt-6">
            <Textarea
              placeholder="Write your thoughts..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={100000}
              className="glass-input min-h-[150px] border-0 text-[15px] resize-none"
            />
            <Button 
              onClick={handleNoteSubmit}
              disabled={!note || loading}
              className="w-full bg-primary hover:bg-primary/90 h-11 smooth-transition font-medium"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Note"}
            </Button>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="glass-input border-0 h-11 text-[15px]"
              />
              <p className="text-xs text-muted-foreground">
                Supports: Images, PDFs, Word documents (max 20MB)
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleFileSubmit}
                disabled={!file || loading}
                className="w-full bg-primary hover:bg-primary/90 h-11 smooth-transition font-medium"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload File"}
              </Button>
              {loading && (
                <p className="text-xs text-muted-foreground text-center">
                  {statusStep === 'uploading' && 'Uploading file…'}
                  {statusStep === 'extracting' && 'Extracting text…'}
                  {statusStep === 'summarizing' && 'Summarizing content…'}
                  {statusStep === 'saving' && 'Saving to your garden…'}
                  {!statusStep && 'Processing…'}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
