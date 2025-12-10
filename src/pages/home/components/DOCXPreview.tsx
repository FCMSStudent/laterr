import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
// Fixed: Use dynamic import for mammoth to prevent "Cannot access before initialization" error
// The mammoth library has internal circular dependencies that cause issues when imported at module level
// Dynamic import ensures the library is only loaded when actually needed
import DOMPurify from 'dompurify';

interface DOCXPreviewProps {
  url: string;
  className?: string;
}

export const DOCXPreview = ({ url, className = '' }: DOCXPreviewProps) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocx = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch the DOCX file
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load document');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert DOCX to HTML using mammoth (dynamically imported)
        const { default: mammoth } = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        // Sanitize the HTML to prevent XSS attacks
        const sanitizedHtml = DOMPurify.sanitize(result.value, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title']
        });
        setHtmlContent(sanitizedHtml);
        
        // Log any messages from mammoth (warnings, etc.)
        if (result.messages.length > 0) {
          console.log('Mammoth conversion messages:', result.messages);
        }
      } catch (err) {
        console.error('Error loading DOCX:', err);
        setError('Failed to load document. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDocx();
  }, [url]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Document Viewer */}
      <div className="flex-1 overflow-auto bg-stone-50 dark:bg-stone-900 rounded-xl p-8 min-h-[300px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="sm" text="Loading document..." />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && htmlContent && (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
      </div>
    </div>
  );
};
