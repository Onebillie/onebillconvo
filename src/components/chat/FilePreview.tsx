import { useState, memo } from 'react';
import { FileIcon, FileText, FileImage, Music, Video, Download, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  };
  onClick?: () => void;
}

export const FilePreview = memo(({ attachment, onClick }: FilePreviewProps) => {
  const imageUrl = getOptimizedImageUrl(attachment.url);
  const [imageLoading, setImageLoading] = useState(!loadedImages.has(imageUrl));
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
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

  const handleDownload = () => {
    window.open(attachment.url, '_blank');
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
      <div className="relative mt-2 rounded-lg overflow-hidden max-w-sm group" onClick={onClick}>
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
                "w-full h-auto object-cover rounded-lg transition-opacity duration-300",
                imageLoading ? "opacity-0" : "opacity-100"
              )}
              loading="eager"
              decoding="async"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </>
        )}
        {!imageLoading && !imageError && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="p-3 bg-background/10 rounded-lg flex items-center justify-between gap-3 max-w-xs cursor-pointer hover:bg-background/20 transition-colors"
        onClick={handleDownload}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.filename}</p>
            {attachment.size ? (
              <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
            ) : (
              <p className="text-xs opacity-70">Click to download</p>
            )}
          </div>
        </div>
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
  );
}, (prevProps, nextProps) => {
  // Only re-render if attachment id or type changes
  return prevProps.attachment.id === nextProps.attachment.id && 
         prevProps.attachment.type === nextProps.attachment.type;
});
