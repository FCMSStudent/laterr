import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { 
  Trash2, Download, RefreshCw, Calendar, Building, FileText, 
  ExternalLink, Sparkles, Beaker, Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { HealthDocument, DocumentType } from "@/features/health/types";
import { DOCUMENT_TYPES, HEALTH_TABLES } from "@/features/health/constants";
import { PDFPreview } from "@/features/bookmarks/components/PDFPreview";
import { DOCXPreview } from "@/features/bookmarks/components/DOCXPreview";
import { ExtractedHealthDataDisplay } from "@/features/health/components/ExtractedHealthDataDisplay";

interface HealthDocumentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: HealthDocument;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}

export const HealthDocumentDetailModal = ({
  open,
  onOpenChange,
  document,
  onUpdate,
  onDelete,
}: HealthDocumentDetailModalProps) => {
  const [regenerating, setRegenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const docType = document.document_type as DocumentType;
  const typeInfo = DOCUMENT_TYPES[docType];

  const isPdf = document.file_type === 'application/pdf';
  const isDocx = document.file_type?.includes('word');
  const isImage = document.file_type?.startsWith('image/');

  const handleDelete = () => {
    onDelete(document.id);
    onOpenChange(false);
  };

  const handleDownload = async () => {
    try {
      // Extract path from signed URL or use file_url directly
      const path = document.file_url.includes('?') 
        ? document.file_url.split('?')[0].split('/').slice(-2).join('/')
        : document.file_url;

      const { data, error } = await supabase.storage
        .from('health-documents')
        .download(path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download file");
    }
  };

  const handleRegenerateSummary = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-file', {
        body: {
          fileUrl: document.file_url,
          fileType: document.file_type,
          fileName: document.title,
        },
      });

      if (error) throw error;

      // Update document with new summary
      const { error: updateError } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .update({ summary: data.summary })
        .eq('id', document.id);

      if (updateError) throw updateError;

      toast.success("Summary regenerated!");
      onUpdate();
    } catch (error) {
      console.error('Error regenerating summary:', error);
      toast.error("Failed to regenerate summary");
    } finally {
      setRegenerating(false);
    }
  };

  const handleExtractData = async () => {
    setExtracting(true);
    try {
      // First get the document content - for now we'll use the summary as content
      // In a real implementation, you'd fetch and parse the actual file
      const contentToAnalyze = document.summary || `Health document: ${document.title}. Type: ${document.document_type}.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-health-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            content: contentToAnalyze,
            document_type: document.document_type,
            file_type: document.file_type,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const { extracted_data } = await response.json();

      // Update document with extracted data
      const { error: updateError } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .update({ extracted_data })
        .eq('id', document.id);

      if (updateError) throw updateError;

      toast.success("Health data extracted successfully!");
      onUpdate();
      setActiveTab("extracted");
    } catch (error) {
      console.error('Error extracting health data:', error);
      toast.error(`Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl !bg-background border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <Badge 
                variant="secondary" 
                className="mb-2"
                style={{ backgroundColor: `${typeInfo?.color}20`, color: typeInfo?.color }}
              >
                {typeInfo?.label || docType}
              </Badge>
              <DialogTitle className="text-2xl font-semibold text-foreground">
                {document.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="sr-only">
            View health document details
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Left: Preview */}
          <div className="flex flex-col">
            <div className="rounded-xl overflow-hidden bg-muted/50 flex-1">
              {isPdf && (
                <PDFPreview url={document.file_url} />
              )}
              {isDocx && (
                <DOCXPreview url={document.file_url} />
              )}
              {isImage && (
                <img 
                  src={document.file_url} 
                  alt={document.title}
                  className="w-full h-auto object-contain"
                />
              )}
              {!isPdf && !isDocx && !isImage && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-2" />
                  <p>Preview not available</p>
                  <Button variant="link" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col space-y-4">
            {/* Metadata */}
            <div className="space-y-3">
              {document.provider_name && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{document.provider_name}</span>
                </div>
              )}
              {document.visit_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {format(new Date(document.visit_date), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  Added {format(new Date(document.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Tabs for Summary / Extracted Data */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary" className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="extracted" className="flex items-center gap-1.5">
                  <Beaker className="w-3.5 h-3.5" />
                  Health Data
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-3 space-y-3">
                <div className="flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerateSummary}
                    disabled={regenerating}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
                {document.summary ? (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {document.summary}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    No summary available. Click regenerate to create one.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="extracted" className="mt-3 space-y-3">
                <div className="flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExtractData}
                    disabled={extracting}
                  >
                    {extracting ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    {document.extracted_data ? 'Re-extract' : 'Extract Data'}
                  </Button>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <ExtractedHealthDataDisplay 
                    data={(document.extracted_data as any) || {}} 
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">#{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
