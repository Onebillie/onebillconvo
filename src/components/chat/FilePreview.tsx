import { useState, memo } from 'react';
import { FileIcon, FileText, FileImage, Music, Video, Download, AlertCircle, Loader2, RefreshCw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PDFViewer } from './PDFViewer';

// Cache for loaded images to prevent flickering
const loadedImages = new Set<string>();

// Generate optimized image URL for Supabase Storage
const getOptimizedImageUrl = (url: string) => {
  if (url.includes('/storage/v1/object/public/')) {
    const optimizedUrl = url.replace('/object/public/', '/render/image/public/');
    return `${optimizedUrl}?width=800&quality=75`;
  }
  return url;
};

interface FilePreviewProps {
  attachment: {
    id: string;
    filename: string;
    url: string;
    type: string;
    size?: number;
    parsed_data?: any;
  };
  messageId?: string;
  onClick?: () => void;
}

export const FilePreview = memo(({ attachment, messageId, onClick }: FilePreviewProps) => {
  const imageUrl = getOptimizedImageUrl(attachment.url);
  const [imageLoading, setImageLoading] = useState(!loadedImages.has(imageUrl));
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fullSizeOpen, setFullSizeOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  
  const isImage = attachment.type?.startsWith('image/');
  const isPDF = attachment.type === 'application/pdf';
  const isAudio = attachment.type?.startsWith('audio/');
  const isVideo = attachment.type?.startsWith('video/');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (isImage) return <FileImage className="w-4 h-4" />;
    if (isPDF) return <FileText className="w-4 h-4" />;
    if (isAudio) return <Music className="w-4 h-4" />;
    if (isVideo) return <Video className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const handleDownload = async () => {
    try {
      // Force download using blob to avoid blank tab issues
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to window.open
      window.open(attachment.url, '_blank');
    }
  };

  const handleRetry = () => {
    setImageError(false);
    setImageLoading(true);
    setRetryCount(prev => prev + 1);
  };

  const handleImageError = () => {
    console.error('Failed to load image:', attachment.url, 'Type:', attachment.type);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    loadedImages.add(imageUrl);
    setImageLoading(false);
  };

  if (isImage) {
    return (
      <>
        <div className="relative mt-2 rounded-lg overflow-hidden max-w-sm group">
          {imageError ? (
            <div className="w-full h-48 bg-muted flex flex-col items-center justify-center rounded-lg p-4 text-center">
              <AlertCircle className="w-8 h-8 text-destructive mb-2" />
              <p className="text-xs text-muted-foreground mb-2">Failed to load image</p>
              <p className="text-xs text-muted-foreground mb-3">{attachment.filename}</p>
              {retryCount < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry();
                  }}
                  className="mb-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(attachment.url, '_blank');
                }}
              >
                <Download className="w-3 h-3 mr-1" />
                Download anyway
              </Button>
            </div>
          ) : (
            <>
              {imageLoading && (
                <Skeleton className="absolute inset-0 w-full h-full" />
              )}
              <img
                key={`${attachment.url}-${retryCount}`}
                src={imageUrl}
                alt={attachment.filename || 'Attachment'}
                className={cn(
                  "w-full h-auto object-cover rounded-lg transition-opacity duration-300 cursor-pointer",
                  imageLoading ? "opacity-0" : "opacity-100"
                )}
                loading="eager"
                decoding="async"
                onLoad={handleImageLoad}
                onError={handleImageError}
                onClick={() => setFullSizeOpen(true)}
              />
            </>
          )}
          {!imageLoading && !imageError && (
            <>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullSizeOpen(true);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                  size="sm"
                  variant="secondary"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        <Dialog open={fullSizeOpen} onOpenChange={setFullSizeOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{attachment.filename}</DialogTitle>
            </DialogHeader>
            <img
              src={attachment.url}
              alt={attachment.filename}
              className="w-full h-auto"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="mt-2">
        <div 
          className="p-3 bg-background/10 rounded-lg flex items-center justify-between gap-3 max-w-xs group hover:bg-background/20 transition-colors cursor-pointer"
          onClick={() => {
            if (isPDF) {
              setPdfViewerOpen(true);
            } else {
              handleDownload();
            }
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.filename}</p>
              {attachment.size ? (
                <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
              ) : (
                <p className="text-xs opacity-70">{isPDF ? 'Click to view' : 'Click to download'}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isPDF && (
        <PDFViewer
          open={pdfViewerOpen}
          onOpenChange={setPdfViewerOpen}
          url={attachment.url}
          filename={attachment.filename}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if attachment id or type changes
  return prevProps.attachment.id === nextProps.attachment.id && 
         prevProps.attachment.type === nextProps.attachment.type;
});
