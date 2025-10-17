import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, Reply, Forward, ExternalLink } from "lucide-react";
import { Message } from "@/types/chat";
import DOMPurify from "dompurify";
import { format } from "date-fns";

interface EmailDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message;
}

export const EmailDetailModal = ({ open, onOpenChange, message }: EmailDetailModalProps) => {
  const isHtml = /<[^>]+>/.test(message.content);
  
  // Sanitize HTML content to prevent XSS
  const sanitizedContent = isHtml 
    ? DOMPurify.sanitize(message.content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                       'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
                       'div', 'span', 'blockquote', 'pre', 'code', 'hr'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'width', 'height'],
        ALLOW_DATA_ATTR: false,
      })
    : message.content;

  const attachments = message.message_attachments || [];
  const hasAttachments = attachments.length > 0;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-xl">
              {message.subject || "(No Subject)"}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                {message.direction === "inbound" ? "From" : "To"}: Customer
              </Badge>
              <span>•</span>
              <span>{format(new Date(message.created_at), "PPpp")}</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Email Content */}
            <div className="border rounded-lg p-4 bg-muted/5">
              {isHtml ? (
                <div 
                  className="email-content prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  style={{
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {sanitizedContent}
                </div>
              )}
            </div>

            {/* Attachments Section */}
            {hasAttachments && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Attachments ({attachments.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachments.map((attachment) => {
                    const isImage = attachment.type?.startsWith('image/');
                    
                    if (isImage) {
                      return (
                        <div key={attachment.id} className="border rounded-lg overflow-hidden">
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(attachment.url, '_blank')}
                          />
                          <div className="p-2 bg-muted/50 flex items-center justify-between">
                            <span className="text-xs truncate flex-1">{attachment.filename}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={() => window.open(attachment.url, '_blank')}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={attachment.id}
                        className="border rounded-lg p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" size="sm">
              <Forward className="w-4 h-4 mr-2" />
              Forward
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
