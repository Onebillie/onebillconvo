import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Message } from "@/types/chat";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCheck, 
  Check, 
  Clock, 
  Send, 
  AlertCircle,
  Mail,
  MessageSquare,
  Phone,
  Facebook,
  Instagram,
  Activity
} from "lucide-react";

interface MessageInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
}

export const MessageInfoDialog = ({ open, onOpenChange, message }: MessageInfoDialogProps) => {
  if (!message) return null;

  // Fetch message logs
  const { data: logs } = useQuery({
    queryKey: ['message-logs', message.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_logs')
        .select('*')
        .eq('message_id', message.id)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open
  });

  const getStatusIcon = () => {
    const status = message.status || (message as any).delivery_status || 'sent';
    switch (status) {
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'delivered':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'sent':
        return <Send className="w-4 h-4 text-gray-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPlatformIcon = () => {
    switch (message.platform) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'whatsapp':
        return <Phone className="w-4 h-4" />;
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created': return <Clock className="w-3 h-3" />;
      case 'sent': return <Send className="w-3 h-3" />;
      case 'delivered': return <Check className="w-3 h-3 text-green-500" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'opened': return <Mail className="w-3 h-3 text-blue-500" />;
      case 'clicked': return <Activity className="w-3 h-3 text-purple-500" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'bounced': return <AlertCircle className="w-3 h-3 text-orange-500" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Message Information</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="logs">Logs ({logs?.length || 0})</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              {getPlatformIcon()}
              <span className="capitalize font-medium">{message.platform}</span>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="capitalize">{(message as any).delivery_status || message.status || 'sent'}</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Direction</p>
              <Badge variant={message.direction === 'inbound' ? 'secondary' : 'default'}>
                {message.direction === 'inbound' ? 'Received' : 'Sent'}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Time</p>
              <p className="text-sm">{format(new Date(message.created_at), 'PPpp')}</p>
            </div>

            {message.content && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Content</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{message.content}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-2 pt-4">
            {logs && logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                    <div className="mt-1">{getEventIcon(log.event_type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{log.event_type}</span>
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), 'PPpp')}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-500">{log.error_message}</p>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground">Metadata</summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No logs available for this message
              </p>
            )}
          </TabsContent>

          <TabsContent value="template" className="space-y-4 pt-4">
            {(message as any).template_name || (message as any).template_content ? (
              <>
                {(message as any).template_name && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Template Name</p>
                    <p className="text-sm font-medium">{(message as any).template_name}</p>
                  </div>
                )}
                
                {(message as any).template_variables && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Variables</p>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                      {JSON.stringify((message as any).template_variables, null, 2)}
                    </pre>
                  </div>
                )}

                {(message as any).template_content && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rendered Content</p>
                    <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {(message as any).template_content}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                This message was not sent using a template
              </p>
            )}
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4 pt-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Delivery Status</p>
              <p className="text-sm font-medium capitalize">
                {(message as any).delivery_status || 'pending'}
              </p>
            </div>

            {(message as any).platform_message_id && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">External Message ID</p>
                <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {(message as any).platform_message_id}
                </p>
              </div>
            )}

            {(message as any).retry_count !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Retry Count</p>
                <p className="text-sm">{(message as any).retry_count}</p>
              </div>
            )}

            {(message as any).opened_at && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Opened At</p>
                <p className="text-sm">{format(new Date((message as any).opened_at), 'PPpp')}</p>
              </div>
            )}

            {(message as any).clicked_at && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Clicked At</p>
                <p className="text-sm">{format(new Date((message as any).clicked_at), 'PPpp')}</p>
              </div>
            )}

            {(message as any).bounce_reason && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bounce Reason</p>
                <p className="text-sm text-red-500">{(message as any).bounce_reason}</p>
              </div>
            )}

            {(message as any).last_error && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Error</p>
                <pre className="text-xs bg-red-50 dark:bg-red-950 p-3 rounded-md overflow-auto">
                  {JSON.stringify((message as any).last_error, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
