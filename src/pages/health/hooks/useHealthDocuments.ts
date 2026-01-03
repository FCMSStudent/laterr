/**
 * Custom hook for managing health documents
 * Provides CRUD operations, file upload, and semantic search using TanStack Query
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HealthDocument, DocumentFormData, DocumentType } from '../types';

interface UseHealthDocumentsOptions {
  documentType?: DocumentType;
}

export const useHealthDocuments = (options?: UseHealthDocumentsOptions) => {
  const queryClient = useQueryClient();

  // Fetch all documents for the current user
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['health-documents', options],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('health_documents' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (options?.documentType) {
        query = query.eq('document_type', options.documentType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as unknown as HealthDocument[];
    },
  });

  // Fetch single document by ID
  const fetchDocument = useCallback(async (id: string): Promise<HealthDocument | null> => {
    const { data, error } = await supabase
      .from('health_documents' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching document:', error);
      return null;
    }

    return data as unknown as HealthDocument;
  }, []);

  // Upload and analyze health document
  const uploadMutation = useMutation({
    mutationFn: async ({ file, formData }: { file: File; formData: DocumentFormData }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('health-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('health-documents')
        .getPublicUrl(filePath);

      // Call edge function to analyze document
      const { data: { session } } = await supabase.auth.getSession();
      
      const analyzeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-health-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            fileUrl: publicUrl,
            fileType: file.type,
            fileName: file.name,
          }),
        }
      );

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze document');
      }

      const analysisResult = await analyzeResponse.json();

      // Create document record with analysis results
      const { data: document, error: dbError } = await supabase
        .from('health_documents' as any)
        .insert({
          user_id: user.id,
          title: formData.title,
          document_type: formData.document_type,
          file_url: publicUrl,
          file_type: file.type,
          provider_name: formData.provider_name || analysisResult.providerName,
          visit_date: formData.visit_date || analysisResult.visitDate,
          summary: analysisResult.summary,
          extracted_data: analysisResult.extractedData,
          embedding: analysisResult.embedding,
          tags: formData.tags || [],
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return document as unknown as HealthDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-documents'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Document uploaded and analyzed! 📄');
    },
    onError: (error) => {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document', {
        description: 'Please try again later',
      });
    },
  });

  // Update document metadata
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DocumentFormData> }) => {
      const { data: result, error } = await supabase
        .from('health_documents' as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as HealthDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-documents'] });
      toast.success('Document updated! ✨');
    },
    onError: (error) => {
      console.error('Error updating document:', error);
      toast.error('Failed to update document', {
        description: 'Please try again later',
      });
    },
  });

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First get the document to get the file URL
      const document = await fetchDocument(id);
      if (!document) throw new Error('Document not found');

      // Delete from storage
      const filePath = document.file_url.split('/').slice(-2).join('/');
      const { error: storageError } = await supabase.storage
        .from('health-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('health_documents' as any)
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-documents'] });
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document', {
        description: 'Please try again later',
      });
    },
  });

  // Semantic search for documents
  const searchDocuments = useCallback(async (query: string): Promise<HealthDocument[]> => {
    if (!query.trim()) return [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate embedding for search query
      const { data: { session } } = await supabase.auth.getSession();
      
      const embeddingResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            title: query,
            summary: '',
            tags: [],
            extractedText: '',
          }),
        }
      );

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate embedding');
      }

      const { embedding } = await embeddingResponse.json();

      // Search for similar documents
      const { data, error } = await (supabase.rpc as any)('find_similar_health_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 10,
        user_id_filter: user.id,
      });

      if (error) throw error;

      // Fetch full document data for results
      if (data && data.length > 0) {
        const ids = data.map((d: any) => d.id);
        const { data: fullDocs, error: fetchError } = await supabase
          .from('health_documents' as any)
          .select('*')
          .in('id', ids);

        if (fetchError) throw fetchError;
        return (fullDocs || []) as unknown as HealthDocument[];
      }

      return [];
    } catch (error) {
      console.error('Error searching documents:', error);
      toast.error('Search failed', {
        description: 'Please try again later',
      });
      return [];
    }
  }, []);

  return {
    documents,
    isLoading,
    error,
    refetch,
    fetchDocument,
    uploadDocument: uploadMutation.mutate,
    uploadDocumentAsync: uploadMutation.mutateAsync,
    updateDocument: updateMutation.mutate,
    updateDocumentAsync: updateMutation.mutateAsync,
    deleteDocument: deleteMutation.mutate,
    deleteDocumentAsync: deleteMutation.mutateAsync,
    searchDocuments,
    isUploading: uploadMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
