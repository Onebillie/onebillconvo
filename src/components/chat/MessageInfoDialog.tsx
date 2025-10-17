import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Message } from "@/types/chat";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MessageInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
}

export const MessageInfoDialog = ({ open, onOpenChange, message }: MessageInfoDialogProps) => {
  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message Info</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
            <Badge variant="outline">{message.status || 'sent'}</Badge>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Platform</p>
            <p className="text-sm">{message.platform}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Direction</p>
            <p className="text-sm capitalize">{message.direction}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
            <p className="text-sm">
              {format(new Date(message.created_at), "PPpp")}
            </p>
          </div>

          {message.is_edited && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Edited</p>
                <p className="text-sm">
                  {message.edited_at && format(new Date(message.edited_at), "PPpp")}
                </p>
              </div>
            </>
          )}

          {message.is_deleted && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Deleted</p>
                <p className="text-sm">
                  {message.deleted_at && format(new Date(message.deleted_at), "PPpp")}
                </p>
              </div>
            </>
          )}

          {message.is_starred && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Starred</p>
                <p className="text-sm">
                  {message.starred_at && format(new Date(message.starred_at), "PPpp")}
                </p>
              </div>
            </>
          )}

          {message.is_pinned && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pinned</p>
                <p className="text-sm">
                  {message.pinned_at && format(new Date(message.pinned_at), "PPpp")}
                </p>
              </div>
            </>
          )}

          {message.forwarded_from && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Forwarded Message</p>
                <p className="text-xs text-muted-foreground">ID: {message.forwarded_from}</p>
              </div>
            </>
          )}

          {message.message_attachments && message.message_attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Attachments</p>
                <p className="text-sm">{message.message_attachments.length} file(s)</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
