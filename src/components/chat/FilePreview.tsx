import { FileIcon, FileText, FileImage, Music, Video, Download } from 'lucide-react';
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

  if (isImage) {
    return (
      <div className="mt-2 group relative">
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="w-full max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
          onClick={onClick || (() => window.open(attachment.url, '_blank'))}
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <Button
            size="icon"
            variant="secondary"
            className="shadow-lg pointer-events-auto"
            onClick={() => window.open(attachment.url, '_blank')}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="p-3 bg-background/10 rounded-lg flex items-center justify-between gap-3 max-w-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.filename}</p>
            {attachment.size && (
              <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={() => window.open(attachment.url, '_blank')}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
