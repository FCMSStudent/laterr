import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EnhancedInput } from "@/components/ui/input";
import { EnhancedTextarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, FileText, File } from "lucide-react";
import { ProgressWithLabel } from "@/components/ProgressWithLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toastSuccess } from "@/lib/toast-with-animation";
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
import { retryWithBackoff, isRetryableError } from "@/lib/retry-utils";

const urlSchema = z.string().url('Invalid URL').max(URL_MAX_LENGTH, 'URL too long');
const noteSchema = z.string().min(1, 'Note cannot be empty').max(NOTE_MAX_LENGTH, 'Note too long');

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: () => void;
}

export const AddItemModal = ({ open, onOpenChange, onItemAdded }: AddItemModalProps) => {
  // Modal for adding URLs, notes, and files to your space
  const [url, setUrl] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState<string>("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

      toastSuccess("URL added to your space! 🌱");
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
      
      // Show retry option for network errors
      if (isRetryableError(error)) {
        toast.error(errorMessage.title, {
          description: errorMessage.message,
          action: {
            label: "Retry",
            onClick: () => handleUrlSubmit(),
          },
        });
      } else {
        toast.error(errorMessage.title, { description: errorMessage.message });
      }
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

      toastSuccess("Note planted in your space! 📝");
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
    setUploadProgress(0);
    setStatusStep('uploading');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Simulate upload progress
      setUploadProgress(20);
      
      // Upload to storage with user-specific path
      const { fileName, publicUrl } = await uploadFileToStorage(file, user.id);
      
      setUploadProgress(50);
      setStatusStep('extracting');

      // Analyze with AI - using the new analyze-file function with public URL
      const { data, error } = await supabase.functions.invoke(SUPABASE_FUNCTION_ANALYZE_FILE, {
        body: {
          fileUrl: publicUrl,
          fileType: file.type,
          fileName: file.name
        }
      });

      if (error) throw error;

      setUploadProgress(75);
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
      setUploadProgress(90);
      setStatusStep('saving');

      const { error: insertError } = await supabase
        .from(SUPABASE_ITEMS_TABLE)
        .insert({
          type: itemType,
          title: data.title,
          content: publicUrl,
          summary: data.summary || data.description,
          tags: [defaultTag],
          preview_image_url: file.type.startsWith('image/') ? publicUrl : (data.previewImageUrl || null),
          user_id: user.id,
        });

      if (insertError) throw insertError;

      setUploadProgress(100);
      const fileTypeLabel = file.type.startsWith('image/') ? 'Image' :
                           file.type === 'application/pdf' ? 'PDF' : 'Document';
      toastSuccess(`${fileTypeLabel} added to your space! 📁`);
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
        
        // Show retry option for network errors
        if (isRetryableError(error)) {
          toast.error(errorMessage.title, {
            description: errorMessage.message,
            action: {
              label: "Retry",
              onClick: () => handleFileSubmit(),
            },
          });
        } else {
          toast.error(errorMessage.title, { description: errorMessage.message });
        }
      }
    } finally {
      setLoading(false);
      setStatusStep(null);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !bg-background border-border shadow-xl">
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
          <TabsList className="grid w-full grid-cols-3 bg-muted rounded-xl">
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
            <EnhancedInput
              id="url-input"
              type="url"
              placeholder="Paste a URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={URL_MAX_LENGTH}
              className="glass-input border-0 h-11 text-[15px]"
              showClearButton={true}
              onClear={() => setUrl('')}
              autoComplete="url"
              aria-label="URL to add"
            />
            <LoadingButton 
              onClick={handleUrlSubmit} 
              loading={loading}
              disabled={!url}
              loadingText="Adding..."
              size="lg"
              className="w-full"
              aria-label="Add URL to collection"
            >
              Add URL
            </LoadingButton>
          </TabsContent>

          <TabsContent value="note" className="space-y-4 mt-6">
            <EnhancedTextarea
              id="note-textarea"
              placeholder="Write your thoughts..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={NOTE_MAX_LENGTH}
              className="glass-input min-h-[150px] border-0 text-[15px] resize-none"
              showCharacterCount={true}
              helperText="Write your thoughts and ideas"
              aria-label="Note content"
            />
            <LoadingButton 
              onClick={handleNoteSubmit}
              loading={loading}
              disabled={!note}
              loadingText="Saving..."
              size="lg"
              className="w-full"
              aria-label="Save note to collection"
            >
              Save Note
            </LoadingButton>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-6">
            <div
              className={`
                relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
                ${isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-border/50 hover:border-border hover:bg-muted/30'
                }
              `}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <div className={`
                  rounded-full p-4 transition-all duration-200
                  ${isDragging ? 'bg-primary/10 scale-110' : 'bg-muted'}
                `}>
                  <File className={`h-8 w-8 transition-colors duration-200 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                
                {file ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-xs"
                    >
                      Remove file
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                      </p>
                      <p className="text-xs text-muted-foreground">or</p>
                    </div>
                    
                    <label htmlFor="file-input" className="cursor-pointer">
                      <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                        Browse files
                      </div>
                      <input
                        id="file-input"
                        type="file"
                        accept={FILE_INPUT_ACCEPT}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="sr-only"
                        aria-required="true"
                        aria-describedby="file-helper-text"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
            
            <p id="file-helper-text" className="text-xs text-muted-foreground text-center">
              Supports: Images, PDFs, Word documents (max {FILE_SIZE_LIMIT_MB}MB)
            </p>
            <div className="space-y-2">
              <LoadingButton
                onClick={handleFileSubmit}
                loading={loading}
                disabled={!file}
                loadingText="Uploading..."
                size="lg"
                className="w-full"
                aria-label="Upload file to collection"
              >
                Upload File
              </LoadingButton>
              {loading && (
                <div className="space-y-2">
                  <ProgressWithLabel
                    value={uploadProgress}
                    label={
                      statusStep === 'uploading' ? 'Uploading file…' :
                      statusStep === 'extracting' ? 'Extracting text…' :
                      statusStep === 'summarizing' ? 'Summarizing content…' :
                      statusStep === 'saving' ? 'Saving to your space…' :
                      'Processing…'
                    }
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
