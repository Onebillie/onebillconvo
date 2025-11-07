import { useState, memo, useEffect } from 'react';
import { FileIcon, FileText, FileImage, Music, Video, Download, AlertCircle, Loader2, RefreshCw, Bot, Maximize2, Bug, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { OneBillDebugger } from '@/components/onebill/OneBillDebugger';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import * as pdfjsLib from 'pdfjs-dist';

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
    parsed_data?: any;
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
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [resending, setResending] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [phoneOverride, setPhoneOverride] = useState<string>('');
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [editingPayload, setEditingPayload] = useState(false);
  const [payloadJson, setPayloadJson] = useState('');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const isImage = attachment.type?.startsWith('image/');
  const isPDF = attachment.type === 'application/pdf';
  const isAudio = attachment.type?.startsWith('audio/');
  const isVideo = attachment.type?.startsWith('video/');

  // Fetch submission status and customer phone for this attachment
  useEffect(() => {
    const fetchSubmissionAndCustomer = async () => {
      if (!attachment.id || !messageId) return;
      
      setLoadingSubmission(true);
      try {
        // Fetch submission status
        const { data: submission, error } = await supabase
          .from('onebill_submissions')
          .select('*')
          .eq('attachment_id', attachment.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setSubmissionStatus(submission);

        // Fetch customer phone from the message's conversation
        if (messageId) {
          const { data: messageData } = await supabase
            .from('messages')
            .select(`
              conversation_id,
              conversations!inner(
                customer_id,
                customers!inner(phone, whatsapp_phone)
              )
            `)
            .eq('id', messageId)
            .single();

          const customer = messageData?.conversations?.customers;
          const actualPhone = customer?.whatsapp_phone || customer?.phone;
          if (actualPhone) {
            setCustomerPhone(actualPhone);
          }
        }
      } catch (error) {
        console.error('Error fetching submission status:', error);
      } finally {
        setLoadingSubmission(false);
      }
    };

    fetchSubmissionAndCustomer();

    // Set up realtime subscription for submission status updates
    if (!attachment.id) return;

    const channel = supabase
      .channel(`onebill-submissions-${attachment.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onebill_submissions',
          filter: `attachment_id=eq.${attachment.id}`
        },
        (payload) => {
          console.log('Submission status update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSubmissionStatus(payload.new);
            toast({
              title: "Status Updated",
              description: `OneBill submission ${payload.new.submission_status}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [attachment.id, messageId, toast]);

  // Initialize payload JSON from submission when it loads or changes
  useEffect(() => {
    if (submissionStatus) {
      const payload: any = {};
      if (submissionStatus.phone) payload.phone = submissionStatus.phone;
      if (submissionStatus.mprn) payload.mprn = submissionStatus.mprn;
      if (submissionStatus.mcc_type) payload.mcc_type = submissionStatus.mcc_type;
      if (submissionStatus.dg_type) payload.dg_type = submissionStatus.dg_type;
      if (submissionStatus.gprn) payload.gprn = submissionStatus.gprn;
      if (submissionStatus.utility) payload.utility = submissionStatus.utility;
      if (submissionStatus.read_value) payload.read_value = submissionStatus.read_value;
      
      setPayloadJson(JSON.stringify(payload, null, 2));
    }
  }, [submissionStatus]);

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

  const convertPDFFirstPageToJPEG = async (url: string, options = { scale: 2, quality: 0.85 }): Promise<Blob> => {
    // Configure worker from CDN to match vision-bill-parser (version 5.4.394)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs';

    // Fetch PDF as ArrayBuffer for better reliability
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // Calculate scale to achieve ~1800px width like vision-bill-parser
    const viewport = page.getViewport({ scale: 1.0 });
    const targetWidth = 1800;
    const scale = Math.min(2.0, targetWidth / viewport.width);
    const scaledViewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = Math.ceil(scaledViewport.width);
    canvas.height = Math.ceil(scaledViewport.height);

    const renderContext: any = {
      canvasContext: context,
      viewport: scaledViewport,
    };

    await page.render(renderContext).promise;

    return new Promise((resolve, reject) => {
      // Try PNG first for better text quality
      canvas.toBlob((pngBlob) => {
        if (pngBlob && pngBlob.size <= 8 * 1024 * 1024) {
          // PNG is good size, use it
          resolve(pngBlob);
        } else {
          // PNG too large, use JPEG
          console.log('PNG too large, converting to JPEG');
          canvas.toBlob((jpegBlob) => {
            if (jpegBlob) {
              resolve(jpegBlob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/jpeg', 0.85);
        }
      }, 'image/png');
    });
  };

  const handleParseWithAI = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setParsing(true);
    setShowParsingStatus(true);
    setParsingSteps([]);
    
    try {
      updateStep('Initializing', 'processing', 'Starting parsing process...');
      
      let attachmentUrlToProcess = attachment.url;

      // Convert PDF to image on client side
      if (isPDF) {
        updateStep('Converting PDF', 'processing', 'Rendering first page to image...');
        try {
          const imageBlob = await convertPDFFirstPageToJPEG(attachment.url, { scale: 2, quality: 0.85 });
          
          // Determine file extension based on blob type
          const fileExt = imageBlob.type === 'image/png' ? 'png' : 'jpg';
          const fileName = `${attachment.id}-p1.${fileExt}`;
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('customer_media')
            .upload(`derived/${fileName}`, imageBlob, { 
              contentType: imageBlob.type, 
              upsert: true 
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('customer_media')
            .getPublicUrl(`derived/${fileName}`);

          attachmentUrlToProcess = publicUrl;
          updateStep('Converting PDF', 'complete', 'PDF converted to image and uploaded');
        } catch (conversionError) {
          updateStep('Converting PDF', 'error', conversionError instanceof Error ? conversionError.message : 'Conversion failed');
          throw conversionError;
        }
      }
      
      updateStep('AI Processing', 'processing', 'Extracting data with AI...');
      
      // Get business_id from conversation
      const { data: messageData } = await supabase
        .from('messages')
        .select('conversation_id, conversations(business_id)')
        .eq('id', messageId)
        .single();
      
      const businessId = messageData?.conversations?.business_id;
      
      const { data, error } = await supabase.functions.invoke('auto-parse-attachment', {
        body: { 
          attachmentId: attachment.id,
          messageId,
          attachmentUrl: attachmentUrlToProcess,
          attachmentType: attachment.type,
          businessId,
          forceReparse: true
        }
      });

      // Handle errors returned in data
      if (data?.error) {
        updateStep('AI Processing', 'error', data.error);
        toast({
          title: "Parsing Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (error) {
        updateStep('AI Processing', 'error', error.message);
        throw error;
      }
      
      if (data?.skipped) {
        updateStep('AI Processing', 'complete', 'Already parsed (using cached data)');
      } else {
        updateStep('AI Processing', 'complete', 'AI extraction complete');
      }
      
      updateStep('Complete', 'complete', 'Parsing finished - data saved and processing triggered automatically');

      setParseResult(data.parsed_data || data);
      toast({
        title: "Parsing Complete",
        description: "Bill has been successfully parsed and sent to OneBill.",
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

  const renderApiRequestSample = (data: any) => {
    const bills = data?.bills;
    
    // Extract phone from bill (service provider phone - for reference only)
    const cusDetails = bills?.cus_details?.[0]?.details;
    let phoneFromBill = cusDetails?.phone;
    if (phoneFromBill) {
      phoneFromBill = phoneFromBill.replace(/\s+/g, '').replace(/^\+|^00/, '');
    }
    
    // The ACTUAL phone used for submission is from customer record
    const actualPhone = customerPhone?.replace(/\s+/g, '').replace(/^\+|^00/, '') || phoneFromBill;
    
    // Build dynamic payload - extract ALL fields we can find
    const payload: any = {};
    
    // Add the ACTUAL phone that will be/was used for submission
    if (actualPhone) {
      payload.phone = formatPhoneForDisplay(actualPhone);
    }
    
    // Check for electricity data
    const electricityData = bills?.electricity?.[0];
    const elecDetails = electricityData?.elec_details || electricityData?.electricity_details;
    const meterDetails = elecDetails?.meter_details;
    
    if (meterDetails?.mprn) payload.mprn = meterDetails.mprn;
    if (meterDetails?.mcc || meterDetails?.mcc_type) payload.mcc_type = meterDetails.mcc || meterDetails.mcc_type;
    if (meterDetails?.dg || meterDetails?.dg_type) payload.dg_type = meterDetails.dg || meterDetails.dg_type;
    
    // Check for gas data
    const gasData = bills?.gas?.[0];
    const gasDetails = gasData?.gas_details;
    const gasMeterDetails = gasDetails?.meter_details;
    
    if (gasMeterDetails?.gprn) payload.gprn = gasMeterDetails.gprn;
    
    // Check top-level structures as fallback
    if (bills?.electricity_bill) {
      const topElec = bills.electricity_bill;
      if (topElec.mprn && !payload.mprn) payload.mprn = topElec.mprn;
      if (topElec.mcc && !payload.mcc_type) payload.mcc_type = topElec.mcc;
      if (topElec.dg && !payload.dg_type) payload.dg_type = topElec.dg;
    }
    
    if (bills?.gas_bill) {
      const topGas = bills.gas_bill;
      if (topGas.gprn && !payload.gprn) payload.gprn = topGas.gprn;
    }
    
    // Determine classification based on what data we found
    let classification = null;
    let endpoint = '';
    
    if (payload.mprn || payload.mcc_type || payload.dg_type) {
      classification = 'electricity';
      endpoint = 'https://api.onebill.ie/api/electricity-file';
    } else if (payload.gprn) {
      classification = 'gas';
      endpoint = 'https://api.onebill.ie/api/gas-file';
    } else if (bills?.services?.meter_reading === true) {
      classification = 'meter';
      endpoint = 'https://api.onebill.ie/api/meter-file';
    }
    
    // If no fields found, show message
    if (!classification || Object.keys(payload).length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          No bill data extracted. Unable to generate API request sample.
        </div>
      );
    }
    
    // All three document types now use multipart/form-data with file upload
    const formFields = Object.entries(payload)
      .filter(([key]) => key !== 'file')
      .map(([key, value]) => `-F "${key}=${value}"`)
      .join(' \\\n  ');

    const curlCommand = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/${attachment.filename}" \\
  ${formFields}`;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">
            {classification === 'electricity' ? 'Electricity Bill' : classification === 'gas' ? 'Gas Bill' : 'Meter Reading'} Submission
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Endpoint: <code className="bg-muted px-1 py-0.5 rounded">POST {endpoint}</code>
          </p>
          <p className="text-xs text-yellow-600 mb-2">
            ⚠️ This endpoint requires multipart/form-data with file attachment
          </p>
        </div>
        
        <div>
          <h4 className="text-xs font-semibold mb-2">Form Data Fields:</h4>
          <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
{`file: [attachment file - ${attachment.filename}]
${Object.entries(payload).map(([key, value]) => `${key}: ${value}`).join('\n')}`}
          </pre>
        </div>
        
        <div>
          <h4 className="text-xs font-semibold mb-2">cURL Example:</h4>
          <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
            {curlCommand}
          </pre>
        </div>
      </div>
    );
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

  const handleSubmitToOneBill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get parsed data from message_attachments
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('message_attachments')
      .select('parsed_data')
      .eq('id', attachment.id)
      .single();

    if (attachmentError || !attachmentData?.parsed_data) {
      toast({
        title: "Error",
        description: "No parsed data available. Please parse the document first.",
        variant: "destructive",
      });
      return;
    }

    const parsedData = attachmentData.parsed_data as any;

    setIsResending(true);
    try {
      // Get business_id from the conversation
      const { data: messageData } = await supabase
        .from('messages')
        .select('conversation_id, conversations(business_id)')
        .eq('id', messageId)
        .single();
      
      const businessId = messageData?.conversations?.business_id;
      
      if (!businessId) {
        throw new Error("Could not determine business ID");
      }

      // Call the onebill-submit function directly - it will create the submission record
      const { data, error } = await supabase.functions.invoke('onebill-submit', {
        body: {
          businessId: businessId,
          attachmentId: attachment.id,
          attachmentUrl: attachment.url,
          documentType: parsedData.documentType,
          phone: customerPhone || parsedData.phone,
          mprn: parsedData.mprn,
          mcc_type: parsedData.mcc_type,
          dg_type: parsedData.dg_type,
          gprn: parsedData.gprn,
        }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || "Submission failed");
      }

      toast({
        title: "Success",
        description: "Submitted to OneBill successfully",
      });
    } catch (error: any) {
      console.error('Error submitting to OneBill:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleResendToOneBill = async () => {
    if (!submissionStatus?.id) {
      toast({
        title: "Error",
        description: "Submission ID not available",
        variant: "destructive",
      });
      return;
    }

    // Validate edited payload if in edit mode
    let manualPayload = null;
    if (editingPayload) {
      try {
        manualPayload = JSON.parse(payloadJson);
      } catch (err) {
        toast({
          title: "Error",
          description: "Invalid JSON format. Please fix the JSON before retrying.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsResending(true);
    setResending(true);
    
    try {
      // Save manual payload override to database if edited
      if (manualPayload) {
        await supabase
          .from('onebill_submissions')
          .update({ manual_payload_override: manualPayload })
          .eq('id', submissionStatus.id);
      }

      // Call the onebill-submit function directly with submission ID
      const { data, error } = await supabase.functions.invoke('onebill-submit', {
        body: {
          submissionId: submissionStatus.id,
          ...(manualPayload && { fields: manualPayload })
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "Successfully resubmitted to OneBill API",
        });
        setEditingPayload(false);
      } else {
        throw new Error(data?.error || "Submission failed");
      }

      // Refresh submission status
      const { data: newStatus } = await supabase
        .from('onebill_submissions')
        .select('*')
        .eq('id', submissionStatus.id)
        .single();

      setSubmissionStatus(newStatus);
    } catch (error: any) {
      console.error('Error resending:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
      setResending(false);
    }
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
              
              {/* Status Badge Overlay */}
              {submissionStatus && (
                <div className="absolute top-2 left-2 z-10">
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shadow-lg backdrop-blur-sm",
                    submissionStatus.submission_status === 'completed' && "bg-green-500/90 text-white",
                    submissionStatus.submission_status === 'failed' && "bg-red-500/90 text-white",
                    submissionStatus.submission_status === 'pending' && "bg-yellow-500/90 text-white"
                  )}>
                    {submissionStatus.submission_status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {submissionStatus.submission_status === 'failed' && <XCircle className="h-3.5 w-3.5" />}
                    {submissionStatus.submission_status === 'pending' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span className="capitalize">{submissionStatus.submission_status}</span>
                  </div>
                </div>
              )}
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
                {attachment.parsed_data && !submissionStatus && (
                  <Button
                    onClick={handleSubmitToOneBill}
                    size="sm"
                    variant="default"
                    disabled={isResending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                )}
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

        {/* Expandable Status Panel */}
        {submissionStatus && (
          <div className="mt-3 border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className="w-full justify-between p-3 h-auto"
              onClick={() => setShowStatusPanel(!showStatusPanel)}
            >
              <div className="flex items-center gap-2">
                {submissionStatus.submission_status === 'completed' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {submissionStatus.submission_status === 'failed' && (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                {submissionStatus.submission_status === 'pending' && (
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                )}
                <span className="font-medium text-sm">OneBill Submission Status</span>
              </div>
              {showStatusPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showStatusPanel && (
              <div className="p-4 border-t bg-muted/30 space-y-3">
                {/* Status Overview */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className={cn(
                      "ml-2 font-medium capitalize",
                      submissionStatus.submission_status === 'completed' && "text-green-600",
                      submissionStatus.submission_status === 'failed' && "text-red-600",
                      submissionStatus.submission_status === 'pending' && "text-yellow-600"
                    )}>
                      {submissionStatus.submission_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">HTTP Status:</span>
                    <span className="ml-2 font-medium">{submissionStatus.http_status || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Retry Count:</span>
                    <span className="ml-2 font-medium">{submissionStatus.retry_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="ml-2 font-medium text-xs">
                      {new Date(submissionStatus.submitted_at || submissionStatus.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {submissionStatus.error_message && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                    <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">Error Message:</p>
                    <p className="text-sm text-red-700 dark:text-red-300">{submissionStatus.error_message}</p>
                  </div>
                )}

                {/* Request Payload */}
                {(submissionStatus.mprn || submissionStatus.gprn || submissionStatus.phone) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Request Sent:</p>
                    <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto border">
                      {JSON.stringify({
                        phone: submissionStatus.phone,
                        ...(submissionStatus.mprn && { MPRN: submissionStatus.mprn }),
                        ...(submissionStatus.mcc_type && { MCC: submissionStatus.mcc_type }),
                        ...(submissionStatus.dg_type && { DG: submissionStatus.dg_type }),
                        ...(submissionStatus.gprn && { gprn: submissionStatus.gprn }),
                      }, null, 2)}
                    </pre>
                  </div>
                )}

                {/* API Response */}
                {submissionStatus.onebill_response && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">API Response:</p>
                    <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto border">
                      {JSON.stringify(submissionStatus.onebill_response, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Resend Section */}
                {submissionStatus.submission_status === 'failed' && (
                  <div className="pt-3 border-t space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Override (Optional):</label>
                      <input
                        type="text"
                        placeholder={customerPhone || "Enter phone number"}
                        value={phoneOverride}
                        onChange={(e) => setPhoneOverride(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use customer phone: {formatPhoneForDisplay(customerPhone || '')}
                      </p>
                    </div>
                    <Button
                      onClick={handleResendToOneBill}
                      disabled={isResending}
                      className="w-full"
                      variant="default"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Resend to OneBill
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                <DialogTitle>Parsed Bill Data & API Request</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="parsed" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="parsed">Parsed Data</TabsTrigger>
                  <TabsTrigger value="api">API Request Sample</TabsTrigger>
                </TabsList>
                <TabsContent value="parsed" className="mt-4 space-y-4">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(parseResult, null, 2)}
                  </pre>
                  <Button onClick={downloadJSON} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                  </Button>
                </TabsContent>
                <TabsContent value="api" className="mt-4">
                  {renderApiRequestSample(parseResult)}
                </TabsContent>
              </Tabs>
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
            <Tabs defaultValue="parsed" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parsed">Parsed Data</TabsTrigger>
                <TabsTrigger value="api">API Request Sample</TabsTrigger>
              </TabsList>
              
              <TabsContent value="parsed" className="space-y-4 mt-4">
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(parseResult, null, 2)}
                </pre>
                <Button onClick={downloadJSON} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>
              </TabsContent>
              
              <TabsContent value="api" className="space-y-4 mt-4">
                {renderApiRequestSample(parseResult)}
              </TabsContent>
            </Tabs>
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
