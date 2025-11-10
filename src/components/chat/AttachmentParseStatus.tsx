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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ParseResult {
  id: string;
  parse_status: string;
  document_type?: string | null;
  parsed_data?: any;
  error_message?: string | null;
  attachment_id?: string;
}

// Helper functions for field extraction
const isValid = (value: any): boolean => {
  return value !== null && value !== undefined && value !== '';
};

const extractElectricityFields = (parsedData: any) => {
  const phone = parsedData?.bills?.cus_details?.[0]?.details?.phone;
  const mprn = parsedData?.bills?.electricity?.[0]?.electricity_details?.meter_details?.mprn;
  const mcc = parsedData?.bills?.electricity?.[0]?.electricity_details?.meter_details?.mcc;
  const dg = parsedData?.bills?.electricity?.[0]?.electricity_details?.meter_details?.dg;
  
  // Try nested structure first, then flat structure (for new parsing format)
  const account_number = parsedData?.bills?.electricity?.[0]?.electricity_details?.account_number 
    || parsedData?.fields?.account_number;
  const supplier_name = parsedData?.bills?.electricity?.[0]?.electricity_details?.supplier_name 
    || parsedData?.fields?.supplier_name;
  
  return { 
    phone, 
    mprn, 
    mcc_type: mcc, 
    dg_type: dg,
    account_number,
    supplier_name
  };
};

const extractGasFields = (parsedData: any) => {
  const phone = parsedData?.bills?.cus_details?.[0]?.details?.phone;
  const gprn = parsedData?.bills?.gas?.[0]?.gas_details?.meter_details?.gprn;
  
  return { phone, gprn };
};

interface AttachmentParseStatusProps {
  messageId: string;
}

export const AttachmentParseStatus = ({ messageId }: AttachmentParseStatusProps) => {
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentFilename, setAttachmentFilename] = useState<string>('');

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
      // Fetch attachment details if available
      if (data.length > 0 && data[0].attachment_id) {
        fetchAttachmentDetails(data[0].attachment_id);
      }
    }
    setLoading(false);
  };

  const fetchAttachmentDetails = async (attachmentId: string) => {
    const { data, error } = await supabase
      .from('message_attachments')
      .select('url, filename, type')
      .eq('id', attachmentId)
      .single();
    
    if (!error && data) {
      setAttachmentUrl(data.url);
      setAttachmentFilename(data.filename);
    }
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

  const ProcessedDataView = ({ result }: { result: ParseResult }) => {
    const hasElectricity = result.parsed_data?.bills?.electricity?.length > 0;
    const hasGas = result.parsed_data?.bills?.gas?.length > 0;
    
    const electricityFields = hasElectricity ? extractElectricityFields(result.parsed_data) : null;
    const gasFields = hasGas ? extractGasFields(result.parsed_data) : null;
    
    return (
      <div className="space-y-6">
        {hasElectricity && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Electricity API Specification</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {isValid(attachmentFilename) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">file (binary):</span>
                <span className="text-muted-foreground">{attachmentFilename || 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isValid(attachmentUrl) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">url (string):</span>
                <span className="text-muted-foreground text-xs truncate max-w-md">{attachmentUrl || 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isValid(electricityFields?.phone) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">phone (string):</span>
                <span className="text-muted-foreground">{electricityFields?.phone || 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isValid(electricityFields?.mprn) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">mprn (string):</span>
                <span className="text-muted-foreground">{electricityFields?.mprn || 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isValid(electricityFields?.mcc_type) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">mcc_type (string):</span>
                <span className="text-muted-foreground">{electricityFields?.mcc_type || 'Missing'}</span>
              </div>
            <div className="flex items-center gap-2">
              {isValid(electricityFields?.dg_type) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span className="font-medium">dg_type (string):</span>
              <span className="text-muted-foreground">{electricityFields?.dg_type || 'Missing'}</span>
            </div>
            <div className="flex items-center gap-2">
              {isValid(electricityFields?.account_number) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span className="font-medium">account_number (string):</span>
              <span className="text-muted-foreground">{electricityFields?.account_number || 'Missing'}</span>
            </div>
            <div className="flex items-center gap-2">
              {isValid(electricityFields?.supplier_name) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span className="font-medium">supplier_name (string):</span>
              <span className="text-muted-foreground">{electricityFields?.supplier_name || 'Missing'}</span>
            </div>
          </div>
          </div>
        )}
        
        {hasGas && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Gas API Specification</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {isValid(attachmentFilename) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">file (binary):</span>
                <span className="text-muted-foreground">{attachmentFilename || 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isValid(attachmentUrl) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">url (string):</span>
                <span className="text-muted-foreground text-xs truncate max-w-md">{attachmentUrl || 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isValid(gasFields?.phone) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">phone (string):</span>
                <span className="text-muted-foreground">{gasFields?.phone || 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                {isValid(gasFields?.gprn) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-medium">gprn (string):</span>
                <span className="text-muted-foreground">{gasFields?.gprn || 'Missing'}</span>
              </div>
            </div>
          </div>
        )}
        
        {!hasElectricity && !hasGas && (
          <div className="text-sm text-muted-foreground">
            No electricity or gas bill data found in parsed results.
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative z-20 flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 border border-border shrink-0 p-0 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Parse status clicked', { messageId, parseResults });
                setDialogOpen(true);
              }}
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
          
          <Tabs defaultValue="parsed" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="parsed">Parsed Data</TabsTrigger>
              <TabsTrigger value="processed">Processed Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="parsed" className="space-y-4 mt-4">
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
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-[400px]">
                        {JSON.stringify(result.parsed_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="processed" className="mt-4">
              {parseResults.map((result, idx) => (
                <div key={idx}>
                  {result.parse_status === 'success' ? (
                    <ProcessedDataView result={result} />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Parse must be successful to view processed data.
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};