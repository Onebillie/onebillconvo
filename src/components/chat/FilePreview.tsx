import { useState, memo } from 'react';
import { FileIcon, FileText, FileImage, Music, Video, Download, AlertCircle, Loader2, RefreshCw, Bot, Maximize2, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { OneBillDebugger } from '@/components/onebill/OneBillDebugger';

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
  messageId?: string;
  onClick?: () => void;
}

export const FilePreview = memo(({ attachment, messageId, onClick }: FilePreviewProps) => {
  const imageUrl = getOptimizedImageUrl(attachment.url);
  const [imageLoading, setImageLoading] = useState(!loadedImages.has(imageUrl));
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fullSizeOpen, setFullSizeOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [showDebugger, setShowDebugger] = useState(false);
  const [showParsingStatus, setShowParsingStatus] = useState(false);
  const [parsingSteps, setParsingSteps] = useState<Array<{ step: string; status: 'pending' | 'processing' | 'complete' | 'error'; message?: string }>>([]);
  const { toast } = useToast();
  
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

  const updateStep = (step: string, status: 'pending' | 'processing' | 'complete' | 'error', message?: string) => {
    setParsingSteps(prev => {
      const existing = prev.find(s => s.step === step);
      if (existing) {
        return prev.map(s => s.step === step ? { ...s, status, message } : s);
      }
      return [...prev, { step, status, message }];
    });
  };

  const handleParseWithAI = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setParsing(true);
    setShowParsingStatus(true);
    setParsingSteps([]);
    
    try {
      updateStep('Initializing', 'processing', 'Starting parsing process...');
      
      updateStep('Routing', 'processing', 'Determining document type...');
      const { data, error } = await supabase.functions.invoke('onebill-parse-router', {
        body: { attachmentUrl: attachment.url }
      });

      if (error) {
        updateStep('Routing', 'error', error.message);
        throw error;
      }
      
      updateStep('Routing', 'complete', 'Document type determined');
      updateStep('AI Processing', 'complete', 'AI extraction complete');
      updateStep('Finalizing', 'complete', 'Parsing successful');

      setParseResult(data);
      toast({
        title: "Parsing Complete",
        description: "Bill has been successfully parsed. Click to view results.",
      });
    } catch (error) {
      console.error('Parse error:', error);
      updateStep('Error', 'error', error instanceof Error ? error.message : "Failed to parse attachment");
      toast({
        title: "Parsing Failed",
        description: error instanceof Error ? error.message : "Failed to parse attachment",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(parseResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parsed-${attachment.filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
                  onClick={handleParseWithAI}
                  size="sm"
                  variant="default"
                  disabled={parsing}
                >
                  {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                </Button>
                {messageId && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDebugger(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Bug className="h-4 w-4" />
                  </Button>
                )}
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

        {parseResult && (
          <Dialog open={!!parseResult} onOpenChange={() => setParseResult(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Parsed Bill Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(parseResult, null, 2)}
                </pre>
                <Button onClick={downloadJSON} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showDebugger && messageId && (
          <Dialog open={showDebugger} onOpenChange={setShowDebugger}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
              <OneBillDebugger
                attachmentId={attachment.id}
                attachmentUrl={attachment.url}
                messageId={messageId}
              />
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={showParsingStatus} onOpenChange={setShowParsingStatus}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Parsing Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {parsingSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="mt-0.5">
                    {step.status === 'processing' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {step.status === 'complete' && (
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                    {step.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    {step.status === 'pending' && (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{step.step}</p>
                    {step.message && (
                      <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="mt-2">
        <div className="p-3 bg-background/10 rounded-lg flex items-center justify-between gap-3 max-w-xs group hover:bg-background/20 transition-colors">
          <div className="flex items-center gap-2 flex-1 min-w-0" onClick={handleDownload}>
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
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="default"
              className="h-8 w-8 shrink-0"
              onClick={handleParseWithAI}
              disabled={parsing}
            >
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            </Button>
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

      {parseResult && (
        <Dialog open={!!parseResult} onOpenChange={() => setParseResult(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Parsed Bill Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(parseResult, null, 2)}
              </pre>
              <Button onClick={downloadJSON} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showParsingStatus} onOpenChange={setShowParsingStatus}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Parsing Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {parsingSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-0.5">
                  {step.status === 'processing' && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {step.status === 'complete' && (
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.step}</p>
                  {step.message && (
                    <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if attachment id or type changes
  return prevProps.attachment.id === nextProps.attachment.id && 
         prevProps.attachment.type === nextProps.attachment.type;
});
