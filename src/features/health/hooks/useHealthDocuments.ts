import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HEALTH_TABLES } from '@/constants/health';
import { EMBEDDING_DIMENSION, isValidEmbedding } from '@/constants';
import type { HealthDocument, HealthDocumentFormData } from '@/types/health';

interface UseHealthDocumentsState {
  loading: boolean;
  error: string | null;
}

export const useHealthDocuments = () => {
  const [state, setState] = useState<UseHealthDocumentsState>({
    loading: false,
    error: null,
  });

  /**
   * Fetch all health documents for current user
   */
  const fetchDocuments = useCallback(async (): Promise<HealthDocument[]> => {
    setState({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setState({ loading: false, error: null });
      return (data ?? []) as HealthDocument[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents';
      setState({ loading: false, error: errorMessage });
      return [];
    }
  }, []);

  /**
   * Fetch a single health document by ID
   */
  const fetchDocument = useCallback(async (id: string): Promise<HealthDocument | null> => {
    setState({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setState({ loading: false, error: null });
      return data as HealthDocument;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch document';
      setState({ loading: false, error: errorMessage });
      return null;
    }
  }, []);

  /**
   * Create a new health document with file upload
   */
  const createDocument = useCallback(async (
    formData: HealthDocumentFormData,
    userId: string
  ): Promise<HealthDocument | null> => {
    setState({ loading: true, error: null });
    try {
      // Upload file
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('health-documents')
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('health-documents')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      const fileUrl = urlData?.signedUrl || fileName;

      // Generate summary and embedding
      let summary: string | null = null;
      let embedding: number[] | null = null;

      try {
        const { data: analysisData } = await supabase.functions.invoke('analyze-file', {
          body: {
            fileUrl,
            fileType: formData.file.type,
            fileName: formData.file.name,
          },
        });

        if (analysisData?.summary) {
          summary = analysisData.summary;
        }

        const { data: embeddingData } = await supabase.functions.invoke('generate-embedding', {
          body: {
            title: formData.title,
            summary: summary || '',
            tags: formData.tags || [],
            extractedText: analysisData?.extractedText || '',
          },
        });

        if (embeddingData?.embedding && isValidEmbedding(embeddingData.embedding)) {
          embedding = embeddingData.embedding;
        }
      } catch (aiError) {
        console.warn('AI processing failed:', aiError);
      }

      // Insert document
      const { data, error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .insert({
          user_id: userId,
          document_type: formData.document_type,
          title: formData.title,
          file_url: fileUrl,
          file_type: formData.file.type,
          provider_name: formData.provider_name || null,
          visit_date: formData.visit_date?.toISOString().split('T')[0] || null,
          summary,
          embedding: embedding ? JSON.stringify(embedding) : null,
          tags: formData.tags || null,
        })
        .select()
        .single();

      if (error) throw error;
      setState({ loading: false, error: null });
      return data as HealthDocument;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document';
      setState({ loading: false, error: errorMessage });
      return null;
    }
  }, []);

  /**
   * Update a health document
   */
  const updateDocument = useCallback(async (
    id: string,
    updates: { title?: string; summary?: string; tags?: string[]; provider_name?: string; visit_date?: string }
  ): Promise<boolean> => {
    setState({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setState({ loading: false, error: null });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document';
      setState({ loading: false, error: errorMessage });
      return false;
    }
  }, []);

  /**
   * Delete a health document
   */
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    setState({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setState({ loading: false, error: null });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setState({ loading: false, error: errorMessage });
      return false;
    }
  }, []);

  /**
   * Search documents using semantic search
   */
  const searchDocuments = useCallback(async (query: string): Promise<HealthDocument[]> => {
    setState({ loading: true, error: null });
    try {
      // Generate embedding for query
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: {
          title: query,
          summary: query,
          tags: [],
          extractedText: '',
        },
      });

      if (embeddingError || !embeddingData?.embedding) {
        // Fall back to text search
        const { data, error } = await supabase
          .from(HEALTH_TABLES.DOCUMENTS)
          .select('*')
          .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setState({ loading: false, error: null });
        return (data ?? []) as HealthDocument[];
      }

      // Use semantic search
      const { data, error } = await supabase.rpc('find_similar_health_documents', {
        query_embedding: JSON.stringify(embeddingData.embedding),
        match_threshold: 0.7,
        match_count: 10,
      });

      if (error) throw error;

      // Fetch full documents
      const ids = (data ?? []).map((d: { id: string }) => d.id);
      if (ids.length === 0) {
        setState({ loading: false, error: null });
        return [];
      }

      const { data: documents, error: docsError } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .select('*')
        .in('id', ids);

      if (docsError) throw docsError;
      setState({ loading: false, error: null });
      return (documents ?? []) as HealthDocument[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setState({ loading: false, error: errorMessage });
      return [];
    }
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    fetchDocuments,
    fetchDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    searchDocuments,
  };
};
