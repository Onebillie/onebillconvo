import { useState, memo } from 'react';
import { FileIcon, FileText, FileImage, Music, Video, Download, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
        {imageLoading && (
          <Skeleton className="w-full h-48" />
        )}
        {imageError ? (
          <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg min-h-[200px]">
            <AlertCircle className="h-12 w-12 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Failed to load image</p>
            <div className="flex gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        ) : (
          <img
            key={`${attachment.id}-${retryCount}`}
            src={imageUrl}
            alt={attachment.filename}
            className="max-w-full h-auto cursor-pointer transition-transform hover:scale-105"
            loading="lazy"
            decoding="async"
            fetchPriority="high"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
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
