import { useState } from 'react';
import { PDFPreview } from '@/features/bookmarks/components/PDFPreview';
import { DOCXPreview } from '@/features/bookmarks/components/DOCXPreview';
import { Button } from "@/ui";

/**
 * Test page to demonstrate the improved loading states for PDF and DOCX viewers.
 * This is a development-only component to showcase the skeleton loading UI,
 * retry functionality, and slow loading detection.
 */
export const ViewerLoadingTestPage = () => {
  const [showPDF, setShowPDF] = useState(false);
  const [showDOCX, setShowDOCX] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [docxUrl, setDocxUrl] = useState('');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Viewer Loading State Test</h1>
          <p className="text-muted-foreground">
            Test the improved loading states with skeleton UI, retry, and slow loading detection.
          </p>
        </div>

        {/* PDF Viewer Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">PDF Viewer</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">PDF URL</label>
              <input
                type="text"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://example.com/sample.pdf"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <Button onClick={() => setShowPDF(!showPDF)}>
              {showPDF ? 'Hide' : 'Show'} PDF Viewer
            </Button>
          </div>
          {showPDF && (
            <div className="h-[500px] border border-border rounded-xl">
              <PDFPreview url={pdfUrl} className="h-full" />
            </div>
          )}
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p><strong>Test scenarios:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Valid PDF: See skeleton → content loads</li>
              <li>Invalid URL: See skeleton → error state with retry button</li>
              <li>Slow loading: Wait 10s to see "Still loading..." message</li>
              <li>Click retry: Loading state resets and tries again</li>
            </ul>
          </div>
        </div>

        {/* DOCX Viewer Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">DOCX Viewer</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">DOCX URL</label>
              <input
                type="text"
                value={docxUrl}
                onChange={(e) => setDocxUrl(e.target.value)}
                placeholder="https://example.com/sample.docx"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <Button onClick={() => setShowDOCX(!showDOCX)}>
              {showDOCX ? 'Hide' : 'Show'} DOCX Viewer
            </Button>
          </div>
          {showDOCX && (
            <div className="h-[500px] border border-border rounded-xl">
              <DOCXPreview url={docxUrl} className="h-full" />
            </div>
          )}
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p><strong>Test scenarios:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Valid DOCX: See skeleton → content loads</li>
              <li>Invalid URL: See skeleton → error state with retry button</li>
              <li>Slow loading: Wait 10s to see "Still loading..." message</li>
              <li>Click retry: Loading state resets and tries again</li>
            </ul>
          </div>
        </div>

        {/* Visual States Demo */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Loading State Features</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Skeleton UI</h3>
              <p className="text-sm text-muted-foreground">
                Animated placeholder that looks like document content while loading.
                No more blank panels!
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Retry Functionality</h3>
              <p className="text-sm text-muted-foreground">
                If loading fails, users can click a "Retry" button to try again
                without closing the modal.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Slow Loading Alert</h3>
              <p className="text-sm text-muted-foreground">
                After 10 seconds, message changes to "Still loading..." to
                reassure users the system is working.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
