import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HEALTH_TABLES } from '@/features/health/constants';
import { isValidEmbedding } from '@/features/bookmarks/constants';
import { SUPABASE_STORAGE_BUCKET_HEALTH_DOCUMENTS } from '@/shared/lib/storage-constants';
import type { HealthDocument, HealthDocumentFormData } from '../types';
import { uploadFileToStorageWithSignedUrl } from '@/shared/lib/supabase-utils';


export interface StructuredError {
  message: string;
  code?: string;
  details?: any;
}

interface UseHealthDocumentsState {
  loading: boolean;
  error: StructuredError | null;
}

type HookResult<T> = Promise<{ data: T | null; error: StructuredError | null }>;

export const useHealthDocuments = () => {
  const [state, setState] = useState<UseHealthDocumentsState>({
    loading: false,
    error: null,
  });

  const handleError = (err: unknown): StructuredError => {
    if (err instanceof Error) {
      return { message: err.message };
    }
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return { message: (err as any).message, code: (err as any).code };
    }
    return { message: 'An unexpected error occurred' };
  };

  /**
   * Fetch all health documents for current user
   */
  const fetchDocuments = useCallback(async (): HookResult<HealthDocument[]> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setState(s => ({ ...s, loading: false }));
      return { data: (data ?? []) as HealthDocument[], error: null };
    } catch (err) {
      const error = handleError(err);
      setState(s => ({ ...s, loading: false, error }));
      return { data: null, error };
    }
  }, []);

  /**
   * Fetch a single health document by ID
   */
  const fetchDocument = useCallback(async (id: string): HookResult<HealthDocument> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setState(s => ({ ...s, loading: false }));
      return { data: data as HealthDocument, error: null };
    } catch (err) {
      const error = handleError(err);
      setState(s => ({ ...s, loading: false, error }));
      return { data: null, error };
    }
  }, []);

  const createDocument = useCallback(async (
    formData: HealthDocumentFormData,
    userId: string
  ): HookResult<HealthDocument> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      // Upload file
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET_HEALTH_DOCUMENTS)
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET_HEALTH_DOCUMENTS)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      const fileUrl = urlData?.signedUrl ?? fileName;

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
      setState(s => ({ ...s, loading: false }));
      return { data: data as HealthDocument, error: null };
    } catch (err) {
      const error = handleError(err);
      setState(s => ({ ...s, loading: false, error }));
      return { data: null, error };
    }
  }, []);

  const updateDocument = useCallback(async (
    id: string,
    updates: { title?: string; summary?: string; tags?: string[]; provider_name?: string; visit_date?: string }
  ): HookResult<boolean> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setState(s => ({ ...s, loading: false }));
      return { data: true, error: null };
    } catch (err) {
      const error = handleError(err);
      setState(s => ({ ...s, loading: false, error }));
      return { data: null, error };
    }
  }, []);

  const deleteDocument = useCallback(async (id: string): HookResult<boolean> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setState(s => ({ ...s, loading: false }));
      return { data: true, error: null };
    } catch (err) {
      const error = handleError(err);
      setState(s => ({ ...s, loading: false, error }));
      return { data: null, error };
    }
  }, []);

  const searchDocuments = useCallback(async (query: string): HookResult<HealthDocument[]> => {
    setState(s => ({ ...s, loading: true, error: null }));
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
        setState(s => ({ ...s, loading: false }));
        return { data: (data ?? []) as HealthDocument[], error: null };
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
        setState(s => ({ ...s, loading: false }));
        return { data: [], error: null };
      }

      const { data: documents, error: docsError } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .select('*')
        .in('id', ids);

      if (docsError) throw docsError;
      setState(s => ({ ...s, loading: false }));
      return { data: (documents ?? []) as HealthDocument[], error: null };
    } catch (err) {
      const error = handleError(err);
      setState(s => ({ ...s, loading: false, error }));
      return { data: null, error };
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
