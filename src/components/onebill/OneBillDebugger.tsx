import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface OneBillDebuggerProps {
  attachmentId: string;
  attachmentUrl: string;
  messageId: string;
}

type StepStatus = 'idle' | 'loading' | 'success' | 'error';

interface Step {
  name: string;
  status: StepStatus;
  result?: any;
  error?: string;
}

export const OneBillDebugger = ({ attachmentId, attachmentUrl, messageId }: OneBillDebuggerProps) => {
  const { toast } = useToast();
  const [steps, setSteps] = useState<Record<string, Step>>({
    parse: { name: 'Parse Document', status: 'idle' },
    extract: { name: 'Extract Data', status: 'idle' },
    submit: { name: 'Submit to OneBill', status: 'idle' },
  });

  const updateStep = (stepKey: string, updates: Partial<Step>) => {
    setSteps(prev => ({
      ...prev,
      [stepKey]: { ...prev[stepKey], ...updates }
    }));
  };

  const step1ParseDocument = async () => {
    updateStep('parse', { status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-attachment-onebill', {
        body: { attachmentUrl }
      });

      if (error) throw error;

      updateStep('parse', { 
        status: 'success', 
        result: data 
      });
      
      toast({
        title: "Step 1 Complete",
        description: "Document parsed successfully",
      });

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateStep('parse', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Step 1 Failed",
        description: errorMsg,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const step2ExtractData = async (parsedData: any) => {
    updateStep('extract', { status: 'loading' });
    
    try {
      // Simulate data extraction and validation
      const bills = parsedData?.bills;
      if (!bills) {
        throw new Error('No bills data in parsed result');
      }

      const customerDetails = bills.cus_details?.[0];
      const phone = customerDetails?.details?.phone;
      
      if (!phone) {
        throw new Error('No phone number found in parsed data');
      }

      const extractedData = {
        phone,
        hasMeterReading: !!bills.meter_reading,
        hasElectricity: !!bills.electricity?.length,
        hasGas: !!bills.gas?.length,
        customerDetails
      };

      updateStep('extract', { 
        status: 'success', 
        result: extractedData 
      });
      
      toast({
        title: "Step 2 Complete",
        description: `Found phone: ${phone}`,
      });

      return extractedData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateStep('extract', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Step 2 Failed",
        description: errorMsg,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const step3SubmitToOneBill = async (extractedData: any, parsedData: any) => {
    updateStep('submit', { status: 'loading' });
    
    try {
      const bills = parsedData.bills;
      const submissions = [];

      // Get business and user IDs
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: businessUsers } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!businessUsers) throw new Error('No business found for user');

      // Create submission for meter reading
      if (bills.meter_reading) {
        const { data: submission, error } = await supabase
          .from('onebill_submissions')
          .insert({
            business_id: businessUsers.business_id,
            submitted_by: user.id,
            document_type: 'meter',
            phone: extractedData.phone,
            utility: bills.meter_reading.utility,
            read_value: bills.meter_reading.read_value,
            unit: bills.meter_reading.unit,
            meter_make: bills.meter_reading.meter_make,
            meter_model: bills.meter_reading.meter_model,
            raw_text: bills.meter_reading.raw_text,
            file_url: attachmentUrl,
            file_name: attachmentUrl.split('/').pop() || 'unknown',
            file_size: 0,
            onebill_endpoint: 'meter-file',
            submission_status: 'pending',
            extracted_fields: bills.meter_reading
          })
          .select()
          .single();

        if (error) throw error;
        submissions.push(submission);
      }

      // Create submission for electricity
      if (bills.electricity?.length > 0) {
        const elec = bills.electricity[0];
        const { data: submission, error } = await supabase
          .from('onebill_submissions')
          .insert({
            business_id: businessUsers.business_id,
            submitted_by: user.id,
            document_type: 'electricity',
            phone: extractedData.phone,
            mprn: elec.electricity_details?.meter_details?.mprn,
            file_url: attachmentUrl,
            file_name: attachmentUrl.split('/').pop() || 'unknown',
            file_size: 0,
            onebill_endpoint: 'electricity-bill',
            submission_status: 'pending',
            extracted_fields: elec
          })
          .select()
          .single();

        if (error) throw error;
        submissions.push(submission);
      }

      // Create submission for gas
      if (bills.gas?.length > 0) {
        const gas = bills.gas[0];
        const { data: submission, error } = await supabase
          .from('onebill_submissions')
          .insert({
            business_id: businessUsers.business_id,
            submitted_by: user.id,
            document_type: 'gas',
            phone: extractedData.phone,
            gprn: gas.gas_details?.meter_details?.gprn,
            file_url: attachmentUrl,
            file_name: attachmentUrl.split('/').pop() || 'unknown',
            file_size: 0,
            onebill_endpoint: 'gas-bill',
            submission_status: 'pending',
            extracted_fields: gas
          })
          .select()
          .single();

        if (error) throw error;
        submissions.push(submission);
      }

      updateStep('submit', { 
        status: 'success', 
        result: { submissions: submissions.length } 
      });
      
      toast({
        title: "Step 3 Complete",
        description: `Created ${submissions.length} submission(s)`,
      });

      return submissions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateStep('submit', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Step 3 Failed",
        description: errorMsg,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const runAllSteps = async () => {
    try {
      const parsedData = await step1ParseDocument();
      const extractedData = await step2ExtractData(parsedData);
      await step3SubmitToOneBill(extractedData, parsedData);
      
      toast({
        title: "All Steps Complete!",
        description: "Document processed successfully",
      });
    } catch (error) {
      // Error already handled in individual steps
    }
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: StepStatus) => {
    const variants: Record<StepStatus, any> = {
      idle: 'secondary',
      loading: 'default',
      success: 'default',
      error: 'destructive'
    };

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>OneBill Processing Debugger</CardTitle>
        <CardDescription>
          Test each step of the document processing pipeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(steps).map(([key, step]) => (
          <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(step.status)}
              <div>
                <div className="flex items-center">
                  <span className="font-medium">{step.name}</span>
                  {getStatusBadge(step.status)}
                </div>
                {step.error && (
                  <p className="text-xs text-destructive mt-1">{step.error}</p>
                )}
                {step.result && step.status === 'success' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(step.result).substring(0, 100)}...
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (key === 'parse') step1ParseDocument();
                else if (key === 'extract') {
                  if (steps.parse.result) step2ExtractData(steps.parse.result);
                  else toast({ title: "Run Step 1 first", variant: "destructive" });
                }
                else if (key === 'submit') {
                  if (steps.parse.result && steps.extract.result) {
                    step3SubmitToOneBill(steps.extract.result, steps.parse.result);
                  } else {
                    toast({ title: "Run Steps 1 & 2 first", variant: "destructive" });
                  }
                }
              }}
              disabled={step.status === 'loading'}
            >
              {step.status === 'loading' ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Running
                </>
              ) : (
                'Run Step'
              )}
            </Button>
          </div>
        ))}

        <div className="pt-4 border-t">
          <Button 
            onClick={runAllSteps} 
            className="w-full"
            disabled={Object.values(steps).some(s => s.status === 'loading')}
          >
            {Object.values(steps).some(s => s.status === 'loading') ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Run All Steps'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
