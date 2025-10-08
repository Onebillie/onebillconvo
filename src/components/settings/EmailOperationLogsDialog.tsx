import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface EmailOperationLog {
  id: string;
  email_account_id: string;
  operation_type: string;
  status: string;
  step_number: number;
  step_name: string;
  details: any;
  error_code: string | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface EmailOperationLogsDialogProps {
  accountId: string;
  accountName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveMode?: boolean;
}

export function EmailOperationLogsDialog({ 
  accountId, 
  accountName, 
  open, 
  onOpenChange,
  liveMode = false 
}: EmailOperationLogsDialogProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const { data: logs, refetch } = useQuery({
    queryKey: ['email-operation-logs', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_operation_logs')
        .select('*')
        .eq('email_account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as EmailOperationLog[];
    },
    enabled: open,
  });

  // Subscribe to real-time updates when in live mode
  useEffect(() => {
    if (!open || !liveMode) return;

    const channel = supabase
      .channel('email-operation-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_operation_logs',
          filter: `email_account_id=eq.${accountId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, liveMode, accountId, refetch]);

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      in_progress: "outline",
      started: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Group logs by operation
  const groupedLogs = logs?.reduce((acc, log) => {
    const key = `${log.operation_type}-${format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(log);
    return acc;
  }, {} as Record<string, EmailOperationLog[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Email Operation Logs - {accountName}</DialogTitle>
          <DialogDescription>
            {liveMode 
              ? "Watching real-time operation progress..." 
              : "View detailed logs of email operations for this account"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {!logs || logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No operation logs found for this account yet.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedLogs || {}).map(([key, operationLogs]) => {
                const firstLog = operationLogs[0];
                const hasError = operationLogs.some(l => l.status === 'error');
                const isExpanded = expandedLogs.has(key);

                return (
                  <Collapsible
                    key={key}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(key)}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="font-medium capitalize">
                            {firstLog.operation_type.replace(/_/g, ' ')}
                          </span>
                          {hasError && <XCircle className="w-4 h-4 text-destructive" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(firstLog.created_at), 'MMM d, HH:mm:ss')}
                          </span>
                          {getStatusBadge(
                            operationLogs[operationLogs.length - 1].status
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="space-y-2 pl-7 pt-2">
                        {operationLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex-shrink-0 pt-0.5">
                              {getStatusIcon(log.status)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">
                                  Step {log.step_number}: {log.step_name}
                                </span>
                                {log.duration_ms && (
                                  <span className="text-xs text-muted-foreground">
                                    {log.duration_ms}ms
                                  </span>
                                )}
                              </div>

                              {log.error_code && (
                                <div className="text-xs">
                                  <Badge variant="destructive" className="text-xs">
                                    {log.error_code}
                                  </Badge>
                                </div>
                              )}

                              {log.error_message && (
                                <p className="text-sm text-destructive">
                                  {log.error_message}
                                </p>
                              )}

                              {log.details && Object.keys(log.details).length > 0 && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    Show technical details
                                  </summary>
                                  <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
