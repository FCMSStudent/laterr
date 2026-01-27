import { useState, useEffect } from 'react';
import { LoadingSpinner } from "@/ui";
import { Button } from "@/ui";
import { RefreshCw } from 'lucide-react';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';

interface DOCXPreviewProps {
  url: string;
  className?: string;
}

export const DOCXPreview = ({ url, className = '' }: DOCXPreviewProps) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSlowLoading, setIsSlowLoading] = useState<boolean>(false);
  const [retryKey, setRetryKey] = useState<number>(0);

  // Timeout for slow loading detection (10 seconds)
  useEffect(() => {
    if (loading) {
      setIsSlowLoading(false);
      const timer = setTimeout(() => {
        if (loading) {
          setIsSlowLoading(true);
        }
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setIsSlowLoading(false);
    }
  }, [loading, retryKey]);

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

        // Convert DOCX to HTML using mammoth
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
  }, [url, retryKey]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setIsSlowLoading(false);
    setRetryKey(prev => prev + 1);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Document Viewer */}
      <div className="flex-1 overflow-auto bg-background/95 rounded-xl p-6 min-h-[300px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-2xl space-y-4">
              {/* Skeleton placeholder */}
              <div className="space-y-3 animate-pulse">
                <div className="h-6 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted/80 rounded w-full"></div>
                <div className="h-4 bg-muted/80 rounded w-5/6"></div>
                <div className="h-4 bg-muted/80 rounded w-full"></div>
                <div className="h-6 bg-muted rounded w-1/2 mt-6"></div>
                <div className="h-4 bg-muted/80 rounded w-full"></div>
                <div className="h-4 bg-muted/80 rounded w-4/5"></div>
                <div className="h-4 bg-muted/80 rounded w-full"></div>
                <div className="h-4 bg-muted/80 rounded w-3/4"></div>
              </div>
              <div className="text-center space-y-2 mt-8">
                <LoadingSpinner size="sm" text={isSlowLoading ? "Still loading document... This may take a moment." : "Loading document..."} />
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
                <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
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
