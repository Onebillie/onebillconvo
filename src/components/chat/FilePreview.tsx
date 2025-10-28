import { useState } from 'react';
import { FileIcon, FileText, FileImage, Music, Video, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export const FilePreview = ({ attachment, onClick }: FilePreviewProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
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

  const handleImageError = () => {
    console.error('Failed to load image:', attachment.url, 'Type:', attachment.type);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  if (isImage) {
    // Show error state if image failed to load
    if (imageError) {
      return (
        <div className="mt-2">
          <div className="p-3 bg-background/10 rounded-lg border border-destructive/50 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm font-medium">Image failed to load</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate opacity-70">{attachment.filename}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 group relative">
        {imageLoading && (
          <div className="w-full max-w-xs h-48 rounded-lg bg-muted/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin opacity-50" />
          </div>
        )}
        <img
          src={attachment.url}
          alt={attachment.filename}
          className={`w-full max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover ${imageLoading ? 'hidden' : ''}`}
          onClick={onClick || handleDownload}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
          crossOrigin="anonymous"
        />
        {!imageLoading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="w-4 h-4" />
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
};
