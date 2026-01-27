import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/ui";
import { LoadingSpinner } from "@/ui";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import { ViewerShell } from './ViewerShell';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Get device pixel ratio for high-resolution rendering, capped at 2 for performance
const getDevicePixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

interface PDFPreviewProps {
  url: string;
  className?: string;
}

export const PDFPreview = ({ url, className = '' }: PDFPreviewProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSlowLoading, setIsSlowLoading] = useState<boolean>(false);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isFitToWidth, setIsFitToWidth] = useState<boolean>(true);
  const viewerRef = useRef<HTMLDivElement | null>(null);

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
    if (!viewerRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(viewerRef.current);
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    setIsSlowLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please try again.');
    setLoading(false);
    setIsSlowLoading(false);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setIsSlowLoading(false);
    setRetryKey(prev => prev + 1);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setIsFitToWidth(false);
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setIsFitToWidth(false);
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const fitToWidth = () => {
    setIsFitToWidth(true);
    setScale(1.0);
  };

  const controls = (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevPage}
          disabled={pageNumber <= 1 || loading}
          className="h-8 w-8 p-0"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-2 min-w-[80px] text-center">
          {loading ? '...' : `${pageNumber} / ${numPages}`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextPage}
          disabled={pageNumber >= numPages || loading}
          className="h-8 w-8 p-0"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          disabled={scale <= 0.5 || loading}
          className="h-8 w-8 p-0"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={fitToWidth}
          disabled={loading}
          className="h-8 w-8 p-0"
          aria-label="Fit to width"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          disabled={scale >= 2.0 || loading}
          className="h-8 w-8 p-0"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </>
  );

  return (
    <ViewerShell controls={controls} className={className} scrollable={true}>
      {loading && (
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-4">
            {/* Skeleton placeholder */}
            <div className="bg-card rounded-lg shadow-lg p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-4/5"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
            <div className="text-center space-y-2">
              <LoadingSpinner size="sm" text={isSlowLoading ? "Still loading PDF... This may take a moment." : "Loading PDF..."} />
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-8 text-center space-y-4">
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
      )}

      {!error && (
        <div ref={viewerRef} className="w-full max-w-full px-4">
          <Document
            key={retryKey}
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            error=""
            className="flex w-full flex-col items-center py-4"
          >
            <Page
              pageNumber={pageNumber}
              {...(isFitToWidth && containerWidth > 0
                ? { width: Math.max(containerWidth - 32, 0) }
                : { scale })}
              devicePixelRatio={getDevicePixelRatio()}
              loading=""
              error=""
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      )}
    </ViewerShell>
  );
};
