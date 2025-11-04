import { useEffect, useState } from "react";
import { Bot, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 border border-border shrink-0">
            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="absolute -top-0.5 -right-0.5">
              {getStatusIcon()}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};