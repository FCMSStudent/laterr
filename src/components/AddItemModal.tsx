import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, FileText, File, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import {
  CATEGORY_OPTIONS,
  DEFAULT_ITEM_TAG,
  DEFAULT_ITEM_TAGS,
  ALLOWED_FILE_MIME_TYPES,
  FILE_INPUT_ACCEPT,
  FILE_SIZE_LIMIT_BYTES,
  FILE_SIZE_LIMIT_MB,
  NOTE_MAX_LENGTH,
  NOTE_SUMMARY_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
  SUPABASE_FUNCTION_ANALYZE_FILE,
  SUPABASE_FUNCTION_ANALYZE_URL,
  SUPABASE_ITEMS_TABLE,
  FILE_ANALYSIS_SIGNED_URL_EXPIRATION,
} from "@/constants";
import { uploadFileToStorage, createSignedUrlForFile } from "@/lib/supabase-utils";
import { formatError, handleSupabaseError } from "@/lib/error-utils";
import { NetworkError, ValidationError, toTypedError } from "@/types/errors";
import { ITEM_ERRORS, getItemErrorMessage } from "@/lib/error-messages";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: () => void;
}

const urlSchema = z.string().url('Invalid URL').max(URL_MAX_LENGTH, 'URL too long');
const noteSchema = z.string().min(1, 'Note cannot be empty').max(NOTE_MAX_LENGTH, 'Note too long');

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
      const errorMsg = urlResult.error.errors[0].message.toLowerCase().includes('invalid') 
        ? ITEM_ERRORS.URL_INVALID 
        : ITEM_ERRORS.URL_TOO_LONG;
      toast.error(errorMsg.title, { description: errorMsg.message });
      return;
    }
    
    setLoading(true);
    setStatusStep('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke(SUPABASE_FUNCTION_ANALYZE_URL, {
        body: { url: urlResult.data }
      });

      if (error) throw error;

      // Set suggested category from AI
      if (data.tag) {
        setSuggestedCategory(data.tag);
      }

      const { error: insertError } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .insert({
          type: 'url',
          title: data.title,
          content: urlResult.data,
          summary: data.summary,
          tags: data.tag ? [data.tag] : [...DEFAULT_ITEM_TAGS],
          preview_image_url: data.previewImageUrl,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      toast.success("URL added to your garden! 🌱");
      setUrl("");
      setSuggestedCategory("");
      onOpenChange(false);
      onItemAdded();
    } catch (error: unknown) {
      const errorMessage = getItemErrorMessage(error, 'url');
      const typedError = toTypedError(error);
      const networkError = new NetworkError(
        errorMessage.message,
        typedError
      );
      
      console.error('Error adding URL:', networkError);
      toast.error(errorMessage.title, { description: errorMessage.message });
    } finally {
      setLoading(false);
      setStatusStep(null);
    }
  };

  const handleNoteSubmit = async () => {
    // Validate note
    const noteResult = noteSchema.safeParse(note.trim());
    if (!noteResult.success) {
      const errorMsg = noteResult.error.errors[0].message.toLowerCase().includes('empty') 
        ? ITEM_ERRORS.NOTE_EMPTY 
        : ITEM_ERRORS.NOTE_TOO_LONG;
      toast.error(errorMsg.title, { description: errorMsg.message });
      return;
    }
    
    setLoading(true);
    setStatusStep('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const firstLine = noteResult.data.split('\n')[0].substring(0, NOTE_TITLE_MAX_LENGTH);

      const { error } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .insert({
          type: 'note',
          title: firstLine || 'Untitled Note',
          content: noteResult.data,
          summary: noteResult.data.substring(0, NOTE_SUMMARY_MAX_LENGTH),
          tags: [...DEFAULT_ITEM_TAGS],
          user_id: user.id,
        });

      if (error) throw error;

      toast.success("Note planted in your garden! 📝");
      setNote("");
      onOpenChange(false);
      onItemAdded();
    } catch (error: unknown) {
      const errorMessage = getItemErrorMessage(error, 'note');
      const typedError = toTypedError(error);
      const networkError = new NetworkError(
        errorMessage.message,
        typedError
      );
      
      console.error('Error adding note:', networkError);
      toast.error(errorMessage.title, { description: errorMessage.message });
    } finally {
      setLoading(false);
      setStatusStep(null);
    }
  };

  const handleFileSubmit = async () => {
    if (!file) {
      toast.error(ITEM_ERRORS.FILE_NOT_SELECTED.title, { 
        description: ITEM_ERRORS.FILE_NOT_SELECTED.message 
      });
      return;
    }

    // Validate file type - now accepting images, PDFs, and Word documents
    const validTypes = ALLOWED_FILE_MIME_TYPES;
    if (!(validTypes as readonly string[]).includes(file.type)) {
      toast.error(ITEM_ERRORS.FILE_INVALID_TYPE.title, { 
        description: ITEM_ERRORS.FILE_INVALID_TYPE.message 
      });
      return;
    }

    // Validate file size (20MB max for documents)
    if (file.size > FILE_SIZE_LIMIT_BYTES) {
      toast.error(ITEM_ERRORS.FILE_TOO_LARGE.title, { 
        description: ITEM_ERRORS.FILE_TOO_LARGE.message 
      });
      return;
    }
    
    setLoading(true);
    setStatusStep('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage with user-specific path
      const { fileName, publicUrl } = await uploadFileToStorage(file, user.id);

      setStatusStep('extracting');

      // Create a short-lived signed URL for backend analysis
      const signedUrl = await createSignedUrlForFile(fileName, FILE_ANALYSIS_SIGNED_URL_EXPIRATION);

      // Analyze with AI - using the new analyze-file function
      const { data, error } = await supabase.functions.invoke(SUPABASE_FUNCTION_ANALYZE_FILE, {
        body: {
          fileUrl: signedUrl,
          fileType: file.type,
          fileName: file.name
        }
      });

      if (error) throw error;

      setStatusStep('summarizing');

      // Determine item type and default tag based on file type
      let itemType = 'file';
      let defaultTag = DEFAULT_ITEM_TAG;

      if (file.type.startsWith('image/')) {
        itemType = 'image';
        defaultTag = data.tag || DEFAULT_ITEM_TAG;  // AI chooses for images
      } else if (file.type === 'application/pdf' || file.type.includes('word')) {
        itemType = 'document';
        defaultTag = DEFAULT_ITEM_TAG;  // Always read later for documents
      }

      // Insert into database
      setStatusStep('saving');

      const { error: insertError } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .insert({
          type: itemType,
          title: data.title,
          content: publicUrl,
          summary: data.description + (data.extractedText ? `\n\nExtracted text: ${data.extractedText}` : ''),
          tags: [defaultTag],
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
    } catch (error: unknown) {
      const typedError = toTypedError(error);
      console.error('Error adding file:', typedError);
      
      const { message, isRateLimitError, isCreditsError } = handleSupabaseError(
        typedError,
        "Failed to add file. Please try again."
      );
      
      // Use specific error messages for rate limiting and credits issues for better UX
      if (isRateLimitError) {
        toast.error(ITEM_ERRORS.AI_RATE_LIMIT.title, { 
          description: ITEM_ERRORS.AI_RATE_LIMIT.message 
        });
      } else if (isCreditsError) {
        toast.error(ITEM_ERRORS.AI_CREDITS_EXHAUSTED.title, { 
          description: ITEM_ERRORS.AI_CREDITS_EXHAUSTED.message 
        });
      } else {
        const errorMessage = getItemErrorMessage(typedError, 'file');
        toast.error(errorMessage.title, { description: errorMessage.message });
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
        <DialogDescription className="sr-only">Add a new item</DialogDescription>

        {loading && suggestedCategory && (
          <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Confirm category:</p>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_OPTIONS.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={suggestedCategory === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSuggestedCategory(value)}
                  className="text-xs"
                >
                  {label}
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
            <div>
              <label htmlFor="url-input" className="sr-only">URL to add</label>
              <Input
                id="url-input"
                type="url"
                placeholder="Paste a URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={URL_MAX_LENGTH}
                className="glass-input border-0 h-11 text-[15px]"
                aria-required="true"
                aria-describedby="url-helper-text"
              />
              <p id="url-helper-text" className="sr-only">Enter a valid URL to add to your collection</p>
            </div>
            <Button 
              onClick={handleUrlSubmit} 
              disabled={!url || loading}
              className="w-full bg-primary hover:bg-primary/90 h-11 smooth-transition font-medium"
              aria-label="Add URL to collection"
            >
              {loading ? (
                <span role="status" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Adding URL...</span>
                </span>
              ) : (
                "Add URL"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="note" className="space-y-4 mt-6">
            <div>
              <label htmlFor="note-textarea" className="sr-only">Note content</label>
              <Textarea
                id="note-textarea"
                placeholder="Write your thoughts..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={NOTE_MAX_LENGTH}
                className="glass-input min-h-[150px] border-0 text-[15px] resize-none"
                aria-required="true"
                aria-describedby="note-helper-text"
              />
              <p id="note-helper-text" className="sr-only">Enter your note content (up to {NOTE_MAX_LENGTH} characters)</p>
            </div>
            <Button 
              onClick={handleNoteSubmit}
              disabled={!note || loading}
              className="w-full bg-primary hover:bg-primary/90 h-11 smooth-transition font-medium"
              aria-label="Save note to collection"
            >
              {loading ? (
                <span role="status" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Saving note...</span>
                </span>
              ) : (
                "Save Note"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-6">
            <div className="space-y-2">
              <label htmlFor="file-input" className="sr-only">File to upload</label>
              <Input
                id="file-input"
                type="file"
                accept={FILE_INPUT_ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="glass-input border-0 h-11 text-[15px]"
                aria-required="true"
                aria-describedby="file-helper-text"
              />
              <p id="file-helper-text" className="text-xs text-muted-foreground">
                Supports: Images, PDFs, Word documents (max {FILE_SIZE_LIMIT_MB}MB)
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleFileSubmit}
                disabled={!file || loading}
                className="w-full bg-primary hover:bg-primary/90 h-11 smooth-transition font-medium"
                aria-label="Upload file to collection"
              >
                {loading ? (
                  <span role="status" aria-live="polite">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Uploading file...</span>
                  </span>
                ) : (
                  "Upload File"
                )}
              </Button>
              {loading && (
                <p className="text-xs text-muted-foreground text-center" role="status" aria-live="polite">
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
