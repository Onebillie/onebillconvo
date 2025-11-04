import { useEffect, useState, useRef, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AutoParseAttachmentProps {
  attachmentId: string;
  attachmentUrl: string;
  fileName: string;
  messageId: string;
  isInbound: boolean;
}

export const AutoParseAttachment = memo(({ 
  attachmentId, 
  attachmentUrl, 
  fileName, 
  messageId,
  isInbound 
}: AutoParseAttachmentProps) => {
  const { currentBusinessId, user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'classifying' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Only auto-process inbound attachments
    if (!isInbound || !currentBusinessId || !user?.id || hasProcessed.current) return;

    const processAttachment = async () => {
      // Mark as processing immediately to prevent duplicate runs
      hasProcessed.current = true;

      // Check if already processed to prevent duplicate submissions
      const { data: existingSubmission } = await supabase
        .from('onebill_submissions')
        .select('id')
        .eq('file_url', attachmentUrl)
        .eq('business_id', currentBusinessId)
        .maybeSingle();

      if (existingSubmission) {
        console.log('[AUTO-PARSE] Attachment already processed, skipping:', fileName);
        setStatus('idle');
        return;
      }
      try {
        setStatus('classifying');

        // Step 1: Classify document
        const { data: classification, error: classifyError } = await supabase.functions.invoke(
          'onebill-classify-document',
          {
            body: {
              fileUrl: attachmentUrl,
              fileName,
              businessId: currentBusinessId,
            },
          }
        );

        if (classifyError) {
          console.error('Classification error:', classifyError);
          setStatus('error');
          setError('Document classification failed');
          return;
        }

        // Validate classification response
        if (classification.error || !classification.fields) {
          setStatus('error');
          setError('AI could not extract required fields');
          return;
        }

        // Only process if it's a utility document
        if (!['meter', 'electricity', 'gas'].includes(classification.classification)) {
          setStatus('idle');
          return;
        }

        // Validate required fields based on document type
        const requiredFields: Record<string, string[]> = {
          meter: ['phone'],
          electricity: ['phone', 'mprn', 'mcc_type', 'dg_type'],
          gas: ['phone', 'gprn']
        };

        const missing = requiredFields[classification.classification]?.filter(
          field => !classification.fields[field]
        );

        if (missing && missing.length > 0) {
          setStatus('error');
          setError(`Missing required fields: ${missing.join(', ')}`);
          return;
        }

        setStatus('submitting');

        // Step 2: Create submission record
        const { data: submission, error: insertError } = await supabase
          .from('onebill_submissions')
          .insert({
            business_id: currentBusinessId,
            file_url: attachmentUrl,
            file_name: fileName,
            file_size: 0,
            document_type: classification.classification,
            classification_confidence: classification.confidence,
            extracted_fields: classification.fields,
            phone: classification.fields.phone,
            mprn: classification.fields.mprn,
            gprn: classification.fields.gprn,
            mcc_type: classification.fields.mcc_type,
            dg_type: classification.fields.dg_type,
            url: attachmentUrl,
            onebill_endpoint: `https://api.onebill.ie/api/${classification.classification}-file`,
            submission_status: 'pending',
            submitted_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Step 3: Submit to OneBill
        const { data: submitData, error: submitError } = await supabase.functions.invoke(
          'onebill-submit',
          {
            body: {
              submissionId: submission.id,
              businessId: currentBusinessId,
              documentType: classification.classification,
              fields: classification.fields,
              fileUrl: attachmentUrl,
              fileName,
            },
          }
        );

        if (submitError) throw submitError;

        if (submitData.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setError(submitData.message || 'Submission failed');
        }
      } catch (err: any) {
        console.error('Auto-parse error:', err);
        setStatus('error');
        setError(err.message || 'Processing failed');
      }
    };

    processAttachment();
  }, [attachmentId, currentBusinessId, user?.id]); // Only depend on user.id, not entire user object

  if (status === 'idle') return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 text-xs">
            {status === 'classifying' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-blue-500">Analyzing...</span>
              </>
            )}
            {status === 'submitting' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                <span className="text-orange-500">Submitting to OneBill...</span>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-green-500">Submitted</span>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-500">Failed</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-xs">
            {status === 'classifying' && 'Analyzing document type...'}
            {status === 'submitting' && 'Submitting to OneBill API...'}
            {status === 'success' && 'Successfully submitted to OneBill'}
            {status === 'error' && `Error: ${error}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

AutoParseAttachment.displayName = 'AutoParseAttachment';
