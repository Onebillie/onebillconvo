import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  filename: string;
}

export const PDFViewer = ({ open, onOpenChange, url, filename }: PDFViewerProps) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1.5);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open || !url) return;

    const loadPDF = async () => {
      try {
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to load PDF:', error);
        toast({
          title: 'Failed to load PDF',
          description: 'Please try downloading the file instead.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [open, url]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef || !currentPage) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const context = canvasRef.getContext('2d');
        
        if (!context) return;

        canvasRef.height = viewport.height;
        canvasRef.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as any).promise;
      } catch (error) {
        console.error('Failed to render page:', error);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, canvasRef]);

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast({
        title: 'Download started',
        description: filename,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{filename}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm">{Math.round(scale * 100)}%</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScale(s => Math.min(3, s + 0.25))}
                  disabled={scale >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 flex items-center justify-center">
              <canvas ref={setCanvasRef} className="max-w-full shadow-lg" />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
