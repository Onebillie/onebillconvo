import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { FileSearch, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ManualParseButtonProps {
  attachmentUrl: string;
  fileName: string;
  onParseComplete?: (result: any) => void;
}

export const ManualParseButton = memo(({ 
  attachmentUrl, 
  fileName,
  onParseComplete 
}: ManualParseButtonProps) => {
  const { currentBusinessId, user } = useAuth();
  const [isParsing, setIsParsing] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Check if OpenAI parsing is available for this business
  useEffect(() => {
    const checkOpenAIAvailability = async () => {
      if (!currentBusinessId) return;

      try {
        // Check if this is OneBillChat business
        const { data: business } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', currentBusinessId)
          .single();

        const isOneBillChat = business?.name?.toLowerCase().includes('onebill');

        // Check if business has OpenAI configured
        const { data: provider } = await supabase
          .from('ai_providers')
          .select('*')
          .eq('business_id', currentBusinessId)
          .eq('provider_name', 'openai')
          .eq('is_active', true)
          .maybeSingle();

        // Show button if either condition is true
        setShowButton(isOneBillChat || !!provider);
      } catch (error) {
        console.error('[MANUAL-PARSE] Error checking OpenAI availability:', error);
      }
    };

    checkOpenAIAvailability();
  }, [currentBusinessId]);

  if (!showButton) return null;

  const handleParse = async () => {
    if (!currentBusinessId || !user) {
      toast.error('Authentication required');
      return;
    }

    try {
      setIsParsing(true);
      toast.info('Parsing document with OpenAI Vision...');

      // Call the OpenAI parsing edge function
      const { data, error } = await supabase.functions.invoke(
        'onebill-parse-with-openai',
        {
          body: {
            fileUrl: attachmentUrl,
            fileName,
            businessId: currentBusinessId,
          },
        }
      );

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Only process if it's a utility document
      if (!['meter', 'electricity', 'gas'].includes(data.classification)) {
        toast.info('Not a utility document');
        return;
      }

      // Validate required fields based on document type
      const requiredFields: Record<string, string[]> = {
        meter: ['phone'],
        electricity: ['phone', 'mprn', 'mcc_type', 'dg_type'],
        gas: ['phone', 'gprn']
      };

      const missing = requiredFields[data.classification]?.filter(
        field => !data.fields[field]
      );

      if (missing && missing.length > 0) {
        toast.error(`Missing required fields: ${missing.join(', ')}`);
        return;
      }

      // Create submission record
      const { data: submission, error: insertError } = await supabase
        .from('onebill_submissions')
        .insert({
          business_id: currentBusinessId,
          file_url: attachmentUrl,
          file_name: fileName,
          file_size: 0,
          document_type: data.classification,
          classification_confidence: data.confidence,
          extracted_fields: data.fields,
          phone: data.fields.phone,
          mprn: data.fields.mprn,
          gprn: data.fields.gprn,
          mcc_type: data.fields.mcc_type,
          dg_type: data.fields.dg_type,
          url: attachmentUrl,
          onebill_endpoint: `https://api.onebill.ie/api/${data.classification}-file`,
          submission_status: 'pending',
          submitted_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success(`Document classified as ${data.classification} (${(data.confidence * 100).toFixed(0)}% confidence)`);

      // Submit to OneBill
      const { data: submitData, error: submitError } = await supabase.functions.invoke(
        'onebill-submit',
        {
          body: {
            submissionId: submission.id,
            businessId: currentBusinessId,
            documentType: data.classification,
            fields: data.fields,
            fileUrl: attachmentUrl,
            fileName,
          },
        }
      );

      if (submitError) throw submitError;

      if (submitData.success) {
        toast.success('Submitted to OneBill successfully!');
        if (onParseComplete) onParseComplete(data);
      } else {
        toast.error(submitData.message || 'OneBill submission failed');
      }
    } catch (error: any) {
      console.error('[MANUAL-PARSE] Error:', error);
      toast.error(error.message || 'Parsing failed');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleParse}
            disabled={isParsing}
            className="h-7 px-2"
          >
            {isParsing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileSearch className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Parse with OpenAI Vision</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ManualParseButton.displayName = 'ManualParseButton';
