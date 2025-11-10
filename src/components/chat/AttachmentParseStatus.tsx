import { useEffect, useState } from "react";
import { Bot, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ParseResult {
  id: string;
  parse_status: string;
  document_type?: string | null;
  parsed_data?: any;
  error_message?: string | null;
}

interface AttachmentParseStatusProps {
  messageId: string;
}

export const AttachmentParseStatus = ({ messageId }: AttachmentParseStatusProps) => {
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchParseResults();
    subscribeToUpdates();
  }, [messageId]);

  const fetchParseResults = async () => {
    const { data, error } = await supabase
      .from('attachment_parse_results')
      .select('*')
      .eq('message_id', messageId);

    if (!error && data) {
      setParseResults(data);
    }
    setLoading(false);
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`parse-results-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attachment_parse_results',
          filter: `message_id=eq.${messageId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setParseResults((prev) => {
              const existing = prev.find((r) => r.id === payload.new.id);
              if (existing) {
                return prev.map((r) => r.id === payload.new.id ? payload.new as ParseResult : r);
              }
              return [...prev, payload.new as ParseResult];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (loading || parseResults.length === 0) {
    return null;
  }

  const hasSuccess = parseResults.some(r => r.parse_status === 'success');
  const hasFailed = parseResults.some(r => r.parse_status === 'failed');
  const hasPending = parseResults.some(r => r.parse_status === 'pending');

  const getStatusIcon = () => {
    if (hasPending) {
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    }
    if (hasSuccess) {
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    }
    if (hasFailed) {
      return <XCircle className="h-3 w-3 text-destructive" />;
    }
    return null;
  };

  const getTooltipContent = () => {
    if (hasPending) {
      return "AI is parsing attachment...";
    }
    if (hasSuccess) {
      const successResults = parseResults.filter(r => r.parse_status === 'success');
      return (
        <div className="space-y-1">
          <p className="font-medium">Successfully parsed!</p>
          {successResults.map((result, idx) => (
            <div key={idx} className="text-xs">
              Type: {result.document_type?.replace(/_/g, ' ').toUpperCase()}
            </div>
          ))}
        </div>
      );
    }
    if (hasFailed) {
      return "Failed to parse attachment";
    }
    return null;
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 border border-border shrink-0 p-0 h-6 hover:bg-muted"
              onClick={() => setDialogOpen(true)}
            >
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="absolute -top-0.5 -right-0.5">
                {getStatusIcon()}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attachment Parse Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {parseResults.map((result, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="text-sm text-muted-foreground capitalize">{result.parse_status}</span>
                </div>
                {result.document_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm text-muted-foreground">{result.document_type.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                )}
                {result.error_message && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-destructive">Error:</span>
                    <p className="text-sm text-muted-foreground">{result.error_message}</p>
                  </div>
                )}
                {result.parsed_data && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Parsed Data:</span>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(result.parsed_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};