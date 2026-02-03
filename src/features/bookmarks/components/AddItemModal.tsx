import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { LoadingButton } from "@/shared/components/ui";
import { EnhancedInput } from "@/shared/components/ui";
import { EnhancedTextarea } from "@/shared/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui";
import { Link2, FileText, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { CATEGORY_OPTIONS, DEFAULT_ITEM_TAG, DEFAULT_ITEM_TAGS, ALLOWED_FILE_MIME_TYPES, FILE_INPUT_ACCEPT, FILE_SIZE_LIMIT_BYTES, FILE_SIZE_LIMIT_MB, NOTE_MAX_LENGTH, NOTE_SUMMARY_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH, URL_MAX_LENGTH, SUPABASE_FUNCTION_ANALYZE_FILE, SUPABASE_FUNCTION_ANALYZE_URL, SUPABASE_ITEMS_TABLE, FILE_ANALYSIS_SIGNED_URL_EXPIRATION, isValidEmbedding } from "@/features/bookmarks/constants";
import { uploadFileToStorage, createSignedUrlForFile, uploadThumbnailToStorage, validateFileForUpload, type UploadValidationOptions } from "@/shared/lib/supabase-utils";
import { checkCommonConfigErrors, getEdgeFunctionErrorDetails, getToastForEdgeFunctionError } from "@/shared/lib/error-utils";
import { NetworkError, toTypedError } from "@/shared/types/errors";
import { ITEM_ERRORS, getItemErrorMessage, getSupabaseFunctionErrorMessage, getUploadErrorMessage } from "@/shared/lib/error-messages";
import { generateThumbnail } from "@/features/bookmarks/utils/thumbnail-generator";
const FILE_VALIDATION_OPTIONS = {
  allowedMimeTypes: ALLOWED_FILE_MIME_TYPES,
  maxFileSizeBytes: FILE_SIZE_LIMIT_BYTES,
} as const;
const urlSchema = z.string().url('Invalid URL').max(URL_MAX_LENGTH, 'URL too long');
const noteSchema = z.string().min(1, 'Note cannot be empty').max(NOTE_MAX_LENGTH, 'Note too long');


interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: () => void;
}
export const AddItemModal = ({
  open,
  onOpenChange,
  onItemAdded
}: AddItemModalProps) => {
  // Modal for adding URLs, notes, and files to your space
  const [activeTab, setActiveTab] = useState<"url" | "note" | "image">("url");
  const [url, setUrl] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState<string>("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = useIsMobile();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);


  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && loading) {
      toast.warning("Please wait for the operation to complete");
      return;
    }

    if (!newOpen) {
      setStatusStep(null);
    }
    onOpenChange(newOpen);
  }, [loading, onOpenChange]);

  const handleSelectedFile = useCallback((selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    try {
      validateFileForUpload(selectedFile, FILE_VALIDATION_OPTIONS);
      setFile(selectedFile);
    } catch (error) {
      const uploadError = getUploadErrorMessage(error);
      toast.error(uploadError.title, {
        description: uploadError.message
      });
    }
  }, []);

  const resetFormState = useCallback(() => {
    setActiveTab("url");
    setUrl("");
    setNote("");
    setFile(null);
    setSuggestedCategory("");
  }, []);

  const handleUrlSubmit = async () => {
    // Validate URL
    const urlResult = urlSchema.safeParse(url.trim());
    if (!urlResult.success) {
      const errorMsg = urlResult.error.errors[0].message.toLowerCase().includes('invalid') ? ITEM_ERRORS.URL_INVALID : ITEM_ERRORS.URL_TOO_LONG;
      toast.error(errorMsg.title, {
        description: errorMsg.message
      });
      return;
    }
    setLoading(true);
    setStatusStep('analyzing url');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      setStatusStep('extracting metadata');
      const {
        data,
        error
      } = await supabase.functions.invoke(SUPABASE_FUNCTION_ANALYZE_URL, {
        body: {
          url: urlResult.data
        }
      });
      if (error) {
        const details = await getEdgeFunctionErrorDetails(error);
        console.error('Supabase function invoke failed:', {
          action: SUPABASE_FUNCTION_ANALYZE_URL,
          ...details
        });
        const toastMessage = getToastForEdgeFunctionError(details);
        toast.error(toastMessage.title, {
          description: toastMessage.description
        });
        return;
      }

      // Log metadata quality for debugging
      console.log('📊 Metadata extracted:', {
        title: data.title,
        tags: data.tags,
        category: data.category,
        confidence: data.confidence,
        hasImage: !!data.previewImageUrl
      });

      // Set suggested category from AI
      if (data.tag || data.category) {
        setSuggestedCategory(data.category || data.tag);
      }

      // Generate embedding for semantic search
      let embedding: number[] | null = null;
      try {
        setStatusStep('generating embeddings');
        const embeddingTags = data.tags || (data.tag ? [data.tag] : [...DEFAULT_ITEM_TAGS]);
        const {
          data: embeddingData,
          error: embeddingError
        } = await supabase.functions.invoke('generate-embedding', {
          body: {
            title: data.title,
            summary: data.summary,
            tags: embeddingTags,
            extractedText: data.description || ''
          }
        });
        if (embeddingError) {
          const details = await getEdgeFunctionErrorDetails(embeddingError);
          console.error('Supabase function invoke failed:', {
            action: 'generate-embedding',
            ...details
          });
          const toastMessage = getToastForEdgeFunctionError(details);
          toast.error(toastMessage.title, {
            description: toastMessage.description
          });
        } else if (embeddingData?.embedding) {
          // Validate embedding is an array with correct dimension
          if (isValidEmbedding(embeddingData.embedding)) {
            embedding = embeddingData.embedding;
          } else {
            console.warn('Invalid embedding dimension, skipping:', embeddingData.embedding?.length);
          }
        }
      } catch (embError) {
        console.warn('Failed to generate embedding, continuing without it:', embError);
      }
      setStatusStep('saving');
      const {
        error: insertError
      } = await supabase.from(SUPABASE_ITEMS_TABLE).insert({
        type: 'url',
        title: data.title,
        content: urlResult.data,
        summary: data.summary,
        tags: data.tags || (data.tag ? [data.tag] : [...DEFAULT_ITEM_TAGS]),
        category: data.category || suggestedCategory || DEFAULT_ITEM_TAG,
        preview_image_url: data.previewImageUrl,
        metadata: {
          author: data.author,
          platform: data.platform,
          contentType: data.contentType,
          siteName: data.siteName,
          publishedTime: data.publishedTime,
          confidence: data.confidence,
        },
        embedding: embedding ? JSON.stringify(embedding) : null,
        user_id: user.id
      });
      if (insertError) throw insertError;

      if (!isMounted.current) return;
      toast.success("URL added to your space! 🌱");
      resetFormState();
      onOpenChange(false);
      onItemAdded();
    } catch (error: unknown) {
      if (!isMounted.current) return;
      const typedError = toTypedError(error);
      console.error('Error adding URL:', typedError);

      // Check for common configuration or authentication issues
      const commonError = checkCommonConfigErrors(error);
      if (commonError) {
        if (commonError.logDetails) {
          console.error(`⚠️ ${commonError.logDetails}`);
        }
        toast.error(commonError.title, {
          description: commonError.description
        });
        return;
      }

      // Use generic error message for other cases
      const errorMessage = getItemErrorMessage(error, 'url');
      const networkError = new NetworkError(errorMessage.message, typedError);
      console.error('Error details:', networkError);
      toast.error(errorMessage.title, {
        description: errorMessage.message
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setStatusStep(null);
      }
    }
  };
  const handleNoteSubmit = async () => {
    // Validate note
    const noteResult = noteSchema.safeParse(note.trim());
    if (!noteResult.success) {
      const errorMsg = noteResult.error.errors[0].message.toLowerCase().includes('empty') ? ITEM_ERRORS.NOTE_EMPTY : ITEM_ERRORS.NOTE_TOO_LONG;
      toast.error(errorMsg.title, {
        description: errorMsg.message
      });
      return;
    }
    setLoading(true);
    setStatusStep('uploading');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const firstLine = noteResult.data.split('\n')[0].substring(0, NOTE_TITLE_MAX_LENGTH);
      const noteSummary = noteResult.data.substring(0, NOTE_SUMMARY_MAX_LENGTH);

      // Generate embedding for semantic search
      let embedding: number[] | null = null;
      try {
        setStatusStep('generating embeddings');
        const {
          data: embeddingData,
          error: embeddingError
        } = await supabase.functions.invoke('generate-embedding', {
          body: {
            title: firstLine || 'Untitled Note',
            summary: noteSummary,
            tags: [...DEFAULT_ITEM_TAGS],
            extractedText: noteResult.data.substring(0, 1000)
          }
        });
        if (embeddingError) {
          const details = await getEdgeFunctionErrorDetails(embeddingError);
          console.error('Supabase function invoke failed:', {
            action: 'generate-embedding',
            ...details
          });
          const toastMessage = getToastForEdgeFunctionError(details);
          toast.error(toastMessage.title, {
            description: toastMessage.description
          });
        } else if (embeddingData?.embedding) {
          // Validate embedding is an array with correct dimension
          if (isValidEmbedding(embeddingData.embedding)) {
            embedding = embeddingData.embedding;
          } else {
            console.warn('Invalid embedding dimension, skipping:', embeddingData.embedding?.length);
          }
        }
      } catch (embError) {
        console.warn('Failed to generate embedding, continuing without it:', embError);
      }
      setStatusStep('saving');
      const {
        error
      } = await supabase.from(SUPABASE_ITEMS_TABLE).insert({
        type: 'note',
        title: firstLine || 'Untitled Note',
        content: noteResult.data,
        summary: noteSummary,
        tags: [...DEFAULT_ITEM_TAGS],
        embedding: embedding ? JSON.stringify(embedding) : null,
        user_id: user.id
      });
      if (error) throw error;

      if (!isMounted.current) return;
      toast.success("Note planted in your space! 📝");
      resetFormState();
      onOpenChange(false);
      onItemAdded();
    } catch (error: unknown) {
      if (!isMounted.current) return;
      const typedError = toTypedError(error);
      console.error('Error adding note:', typedError);

      // Check for common configuration or authentication issues
      const commonError = checkCommonConfigErrors(error);
      if (commonError) {
        if (commonError.logDetails) {
          console.error(`⚠️ ${commonError.logDetails}`);
        }
        toast.error(commonError.title, {
          description: commonError.description
        });
        return;
      }

      // Use generic error message for other cases
      const errorMessage = getItemErrorMessage(error, 'note');
      const networkError = new NetworkError(errorMessage.message, typedError);
      console.error('Error details:', networkError);
      toast.error(errorMessage.title, {
        description: errorMessage.message
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setStatusStep(null);
      }
    }
  };
  const handleFileSubmit = async () => {
    if (!file) {
      toast.error(ITEM_ERRORS.FILE_NOT_SELECTED.title, {
        description: ITEM_ERRORS.FILE_NOT_SELECTED.message
      });
      return;
    }

    try {
      validateFileForUpload(file, FILE_VALIDATION_OPTIONS);
    } catch (error) {
      const uploadError = getUploadErrorMessage(error);
      toast.error(uploadError.title, {
        description: uploadError.message
      });
      return;
    }
    setLoading(true);
    setStatusStep('uploading');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate file before upload
      validateFileForUpload(file, FILE_VALIDATION_OPTIONS);

      // Upload to storage with user-specific path
      const {
        fileName,
        storagePath
      } = await uploadFileToStorage(file, user.id);

      // Generate thumbnail for preview
      setStatusStep('generating thumbnail');
      let thumbnailUrl: string | null = null;
      try {
        const thumbnailBlob = await generateThumbnail(file, file.name);
        thumbnailUrl = await uploadThumbnailToStorage(thumbnailBlob, user.id);
      } catch (thumbnailError) {
        console.warn('Failed to generate thumbnail, continuing without it:', thumbnailError);
      }
      setStatusStep('extracting');

      // Create a temporary signed URL for the analyze-file function
      const signedUrl = await createSignedUrlForFile(fileName, FILE_ANALYSIS_SIGNED_URL_EXPIRATION);

      // Analyze with AI - using the analyze-file function with signed URL
      const {
        data,
        error
      } = await supabase.functions.invoke(SUPABASE_FUNCTION_ANALYZE_FILE, {
        body: {
          fileUrl: signedUrl,
          fileType: file.type,
          fileName: file.name
        }
      });
      if (error) {
        const details = await getEdgeFunctionErrorDetails(error);
        console.error('Supabase function invoke failed:', {
          action: SUPABASE_FUNCTION_ANALYZE_FILE,
          ...details
        });
        const toastMessage = getToastForEdgeFunctionError(details);
        toast.error(toastMessage.title, {
          description: toastMessage.description
        });
        return;
      }
      setStatusStep('summarizing');

      // Determine item type and default tag based on file type
      let itemType = 'file';
      let defaultTag: string = DEFAULT_ITEM_TAG;
      if (file.type.startsWith('image/')) {
        itemType = 'image';
        defaultTag = data.tag || DEFAULT_ITEM_TAG; // AI chooses for images
      } else if (file.type === 'application/pdf' || file.type.includes('word')) {
        itemType = 'document';
        defaultTag = DEFAULT_ITEM_TAG; // Always read later for documents
      } else if (file.type.startsWith('video/')) {
        itemType = 'video';
        defaultTag = 'watch later'; // Videos go to watch later
      }

      // Generate embedding for semantic search
      let embedding: number[] | null = null;
      try {
        setStatusStep('generating embeddings');
        const {
          data: embeddingData,
          error: embeddingError
        } = await supabase.functions.invoke('generate-embedding', {
          body: {
            title: data.title,
            summary: data.summary || data.description,
            tags: [defaultTag],
            extractedText: data.extractedText || ''
          }
        });
        if (embeddingError) {
          const details = await getEdgeFunctionErrorDetails(embeddingError);
          console.error('Supabase function invoke failed:', {
            action: 'generate-embedding',
            ...details
          });
          const toastMessage = getToastForEdgeFunctionError(details);
          toast.error(toastMessage.title, {
            description: toastMessage.description
          });
        } else if (embeddingData?.embedding) {
          // Validate embedding is an array with correct dimension
          if (isValidEmbedding(embeddingData.embedding)) {
            embedding = embeddingData.embedding;
          } else {
            console.warn('Invalid embedding dimension, skipping:', embeddingData.embedding?.length);
          }
        }
      } catch (embError) {
        console.warn('Failed to generate embedding, continuing without it:', embError);
      }

      // Insert into database
      setStatusStep('saving');
      const {
        error: insertError
      } = await supabase.from(SUPABASE_ITEMS_TABLE).insert({
        type: itemType,
        title: data.title,
        content: storagePath,
        summary: data.summary || data.description,
        tags: [defaultTag],
        preview_image_url: thumbnailUrl || (file.type.startsWith('image/') ? storagePath : data.previewImageUrl || null),
        embedding: embedding ? JSON.stringify(embedding) : null,
        user_id: user.id
      });
      if (insertError) throw insertError;

      if (!isMounted.current) return;
      const fileTypeLabel = file.type.startsWith('image/') ? 'Image' : file.type === 'application/pdf' ? 'PDF' : file.type.startsWith('video/') ? 'Video' : 'Document';
      toast.success(`${fileTypeLabel} added to your space! 📁`);
      resetFormState();
      onOpenChange(false);
      onItemAdded();
    } catch (error: unknown) {
      if (!isMounted.current) return;
      const typedError = toTypedError(error);
      console.error('Error adding file:', typedError);
      const uploadError = getUploadErrorMessage(typedError);
      toast.error(uploadError.title, {
        description: uploadError.message
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setStatusStep(null);
      }
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
      handleSelectedFile(droppedFile);
    }
  };

  // Shared content for both Dialog and Drawer
  const ModalContent = () => (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-muted rounded-xl">
        <TabsTrigger value="url" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white smooth-transition min-h-[44px] md:min-h-0">
          <Link2 className="h-4 w-4" />
          URL
        </TabsTrigger>
        <TabsTrigger value="note" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white smooth-transition min-h-[44px] md:min-h-0">
          <FileText className="h-4 w-4" />
          Note
        </TabsTrigger>
        <TabsTrigger value="image" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white smooth-transition min-h-[44px] md:min-h-0">
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
          onChange={e => setUrl(e.target.value)}
          maxLength={URL_MAX_LENGTH}
          className="glass-input border-0 h-12 md:h-11 text-[15px] min-h-[44px]"
          showClearButton={true}
          onClear={() => setUrl('')}
          autoComplete="url"
          aria-label="URL to add"
          inputMode="url"
        />
        <LoadingButton
          onClick={handleUrlSubmit}
          loading={loading}
          disabled={!url}
          loadingText="Adding..."
          size="lg"
          className="w-full min-h-[48px]"
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
          onChange={e => setNote(e.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          className="glass-input min-h-[150px] md:min-h-[150px] border-0 text-[15px] resize-none"
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
          className="w-full min-h-[48px]"
          aria-label="Save note to collection"
        >
          Save Note
        </LoadingButton>
      </TabsContent>

      <TabsContent value="image" className="space-y-4 mt-6">
        <div className={`
            relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
            ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/50 hover:border-border hover:bg-muted/30'}
          `} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
          <div className="items-center justify-center space-y-3 text-center flex flex-col">
            <div className={`
              rounded-full p-4 transition-all duration-200
              ${isDragging ? 'bg-primary/10 scale-110' : 'bg-muted'}
            `}>
              <File className={`h-8 w-8 transition-colors duration-200 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>

            {file ? <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)} className="text-xs min-h-[44px]">
                Remove file
              </Button>
            </div> : <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-xs text-muted-foreground">or</p>
              </div>

              <label htmlFor="file-input" className="cursor-pointer">
                <div className="px-6 py-3 md:px-4 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium min-h-[48px] flex items-center justify-center">
                  Browse files
                </div>
                <input id="file-input" type="file" accept={FILE_INPUT_ACCEPT} onChange={e => handleSelectedFile(e.target.files?.[0] || null)} className="sr-only" aria-required="true" aria-describedby="file-helper-text" />
              </label>
            </>}
          </div>
        </div>

        <p id="file-helper-text" className="text-xs text-muted-foreground text-center">
          Supports: Images, PDFs, Word, Excel, PowerPoint, CSV, TXT (max {FILE_SIZE_LIMIT_MB}MB)
        </p>
        <div className="space-y-2">
          <LoadingButton
            onClick={handleFileSubmit}
            loading={loading}
            disabled={!file}
            loadingText="Uploading..."
            size="lg"
            className="w-full min-h-[48px]"
            aria-label="Upload file to collection"
          >
            Upload File
          </LoadingButton>
          {loading && <p className="text-xs text-muted-foreground text-center" role="status" aria-live="polite">
            {statusStep === 'uploading' && 'Uploading file…'}
            {statusStep === 'extracting' && 'Extracting text…'}
            {statusStep === 'summarizing' && 'Summarizing content…'}
            {statusStep === 'generating embeddings' && 'Generating embeddings…'}
            {statusStep === 'saving' && 'Saving to your space…'}
            {!statusStep && 'Processing…'}
          </p>}
        </div>
      </TabsContent>
    </Tabs>
  );

  return isMobile ? (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent
        className="max-h-[90vh] pb-safe"
        onPointerDownOutside={(e) => loading && e.preventDefault()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
      >
        <DrawerHeader>
          <DrawerTitle className="text-xl font-semibold text-foreground">
            Add New Item
          </DrawerTitle>
          <DrawerDescription className="sr-only">Add a new item</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <ModalContent />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => loading && e.preventDefault()}
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Add New Item
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">Add a new item</DialogDescription>
        <ModalContent />
      </DialogContent>
    </Dialog>
  );
};
