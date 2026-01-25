import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/ui";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/ui";
import { Button } from "@/ui";
import { LoadingButton } from "@/ui";
import { Input } from "@/ui";
import { Label } from "@/ui";
import { Textarea } from "@/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui";
import { Badge } from "@/ui";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { HEALTH_TABLES, DOCUMENT_TYPES } from "@/features/health/constants";
import { SUPABASE_STORAGE_BUCKET_HEALTH_DOCUMENTS } from "@/shared/lib/storage-constants";
import type { DocumentType } from "@/features/health/types";
import { format } from "date-fns";

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface AddHealthDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentAdded: () => void;
}

export const AddHealthDocumentModal = ({
  open,
  onOpenChange,
  onDocumentAdded,
}: AddHealthDocumentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [visitDate, setVisitDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = useIsMobile();

  const resetForm = () => {
    setDocumentType("");
    setTitle("");
    setProvider("");
    setVisitDate(format(new Date(), "yyyy-MM-dd"));
    setFile(null);
    setNotes("");
    setTags([]);
    setTagInput("");
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
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
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      toast.error("Invalid file type", { description: "Please upload a PDF, DOCX, or image file" });
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "Maximum file size is 20MB" });
      return;
    }
    setFile(selectedFile);
    // Auto-fill title from filename if empty
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!documentType) {
      toast.error("Please select a document type");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!file) {
      toast.error("Please upload a file");
      return;
    }

    setLoading(true);
    setStatusStep('uploading');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to health-documents bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET_HEALTH_DOCUMENTS)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET_HEALTH_DOCUMENTS)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = urlData?.signedUrl || fileName;

      // Generate summary using AI
      setStatusStep('analyzing');
      let summary = null;
      let embedding = null;

      try {
        // Try to generate summary
        const { data: summaryData, error: summaryError } = await supabase.functions.invoke('analyze-file', {
          body: {
            fileUrl,
            fileType: file.type,
            fileName: file.name,
          },
        });

        if (!summaryError && summaryData?.summary) {
          summary = summaryData.summary;
        }

        // Generate embedding
        setStatusStep('generating embeddings');
        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
          body: {
            title,
            summary: summary || '',
            tags,
            extractedText: summaryData?.extractedText || '',
          },
        });

        if (!embeddingError && embeddingData?.embedding) {
          embedding = embeddingData.embedding;
        }
      } catch (aiError) {
        console.warn('AI analysis failed, continuing without:', aiError);
      }

      // Insert document record
      setStatusStep('saving');
      const { error: insertError } = await supabase.from(HEALTH_TABLES.DOCUMENTS).insert({
        user_id: user.id,
        document_type: documentType,
        title: title.trim(),
        file_url: fileUrl,
        file_type: file.type,
        provider_name: provider.trim() || null,
        visit_date: visitDate || null,
        summary,
        embedding: embedding ? JSON.stringify(embedding) : null,
        tags: tags.length > 0 ? tags : null,
      });

      if (insertError) throw insertError;

      toast.success("Document uploaded! 📄");
      resetForm();
      onOpenChange(false);
      onDocumentAdded();
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error("Failed to upload document");
    } finally {
      setLoading(false);
      setStatusStep(null);
    }
  };

  const FormContent = () => (
    <div className="space-y-4 mt-4">
      {/* Document Type */}
      <div className="space-y-2">
        <Label htmlFor="docType">Document Type *</Label>
        <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOCUMENT_TYPES).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Document title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider / Facility</Label>
            <Input
              id="provider"
              placeholder="Hospital, clinic, or doctor name..."
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          </div>

          {/* Visit Date */}
          <div className="space-y-2">
            <Label htmlFor="visitDate">Document Date *</Label>
            <Input
              id="visitDate"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>File *</Label>
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="w-8 h-8 text-primary" />
                    ) : (
                      <FileText className="w-8 h-8 text-primary" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-sm line-clamp-1">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop file here or <span className="text-primary underline">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOCX, JPEG, PNG (max 20MB)
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Status indicator */}
          {statusStep && (
            <div className="text-sm text-muted-foreground text-center py-2">
              {statusStep === 'uploading' && 'Uploading file...'}
              {statusStep === 'analyzing' && 'Analyzing document...'}
              {statusStep === 'generating embeddings' && 'Generating embeddings...'}
              {statusStep === 'saving' && 'Saving...'}
            </div>
          )}

          {/* Submit */}
          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            disabled={!documentType || !title || !file}
            className="w-full"
          >
            Upload Document
          </LoadingButton>
        </div>
      );

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] pb-safe">
        <DrawerHeader>
          <DrawerTitle className="text-xl font-semibold text-foreground">
            Add Health Document
          </DrawerTitle>
          <DrawerDescription>
            Upload a health document for easy access and insights
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <FormContent />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg !bg-background border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Add Health Document
          </DialogTitle>
          <DialogDescription>
            Upload a health document for easy access and insights
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
};
