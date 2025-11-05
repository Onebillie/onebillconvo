import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react';

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
    autoProcess: { name: 'Auto Process (Server)', status: 'idle' },
    parse: { name: 'Parse Document (Router)', status: 'idle' },
    validate: { name: 'Validate & Map Fields', status: 'idle' },
    submitMeter: { name: 'Submit Meter', status: 'idle' },
    submitGas: { name: 'Submit Gas', status: 'idle' },
    submitElectricity: { name: 'Submit Electricity', status: 'idle' },
  });

  const [parsedData, setParsedData] = useState<any>(null);
  const [validationData, setValidationData] = useState<any>(null);

  const updateStep = (stepKey: string, updates: Partial<Step>) => {
    setSteps(prev => ({
      ...prev,
      [stepKey]: { ...prev[stepKey], ...updates }
    }));
  };

  const stepAutoProcess = async () => {
    updateStep('autoProcess', { status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-process-onebill', {
        body: { 
          attachment_id: attachmentId,
          message_id: messageId,
          attachment_url: attachmentUrl,
          attachment_type: attachmentUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
        }
      });

      if (error) throw error;

      updateStep('autoProcess', { 
        status: 'success', 
        result: data 
      });
      
      toast({
        title: "Auto Process Complete",
        description: "Document processed and submitted to OneBill API",
      });

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateStep('autoProcess', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Auto Process Failed",
        description: errorMsg,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const step1ParseDocument = async () => {
    updateStep('parse', { status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('onebill-parse-router', {
        body: { attachmentUrl }
      });

      if (error) throw error;

      setParsedData(data);
      updateStep('parse', { 
        status: 'success', 
        result: data 
      });
      
      const routerDecision = data._router?.decision || 'unknown';
      toast({
        title: "Parse Complete",
        description: `Parsed via ${routerDecision} engine`,
      });

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateStep('parse', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Parse Failed",
        description: errorMsg,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const step2ValidateAndMap = async (data: any) => {
    updateStep('validate', { status: 'loading' });
    
    try {
      const bills = data?.bills;
      if (!bills) {
        throw new Error('No bills data in parsed result');
      }

      const customerDetails = bills.cus_details?.[0];
      const phone = customerDetails?.details?.phone;
      
      if (!phone) {
        throw new Error('No phone number found in parsed data');
      }

      // Check what type of document this is
      const hasElectricityBill = bills.electricity && bills.electricity.length > 0;
      const hasGasBill = bills.gas && bills.gas.length > 0;
      const hasMeterReading = bills.meter_reading?.read_value;

      // Determine validation based on document type
      let validation: any = { phone };

      // LOGIC: If it's a bill (electricity or gas), use the bill API
      if (hasElectricityBill) {
        const electricity = bills.electricity[0];
        validation.electricity = {
          mprn: electricity.electricity_details.meter_details.mprn,
          mcc_type: electricity.electricity_details.meter_details.mcc,
          dg_type: electricity.electricity_details.meter_details.dg,
        };
        validation.documentType = 'electricity_bill';
      } else if (hasGasBill) {
        const gas = bills.gas[0];
        validation.gas = {
          gprn: gas.gas_details.meter_details.gprn,
        };
        validation.documentType = 'gas_bill';
      } 
      // LOGIC: If NO bill but has meter reading, it's a meter photo
      else if (hasMeterReading) {
        const meterReading = bills.meter_reading;
        validation.meter = {
          utility: meterReading.utility || 'gas',
          read_value: meterReading.read_value,
          unit: meterReading.unit || 'm3',
          meter_make: meterReading.meter_make,
          meter_model: meterReading.meter_model,
          meter_serial: meterReading.meter_serial,
          read_date: meterReading.read_date,
          raw_text: meterReading.raw_text,
          confidence: 0.9,
        };
        validation.documentType = 'meter_photo';
      } else {
        throw new Error('No valid utility data found - not a bill and no meter reading');
      }

      setValidationData(validation);
      updateStep('validate', { 
        status: 'success', 
        result: validation 
      });
      
      const types = [];
      if (validation.electricity) types.push('electricity bill');
      if (validation.gas) types.push('gas bill');
      if (validation.meter) types.push('meter photo');

      toast({
        title: "Validation Complete",
        description: `Detected: ${types.join(', ') || 'Unknown'}`,
      });

      return validation;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateStep('validate', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Validation Failed",
        description: errorMsg,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const submitToDatabase = async (type: 'meter' | 'gas' | 'electricity', fields: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: businessUsers } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!businessUsers) throw new Error('No business found for user');

    const { data, error } = await supabase
      .from('onebill_submissions')
      .insert({
        business_id: businessUsers.business_id,
        submitted_by: user.id,
        document_type: type,
        phone: validationData.phone,
        file_url: attachmentUrl,
        file_name: attachmentUrl.split('/').pop() || 'unknown',
        file_size: 0,
        onebill_endpoint: `${type}-file`,
        submission_status: 'pending',
        extracted_fields: fields,
        ...fields
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const step3SubmitMeter = async () => {
    if (!validationData?.meter) {
      toast({
        variant: "destructive",
        title: "No Meter Data",
        description: "No meter reading found to submit",
      });
      return;
    }

    updateStep('submitMeter', { status: 'loading' });
    
    try {
      const dbResult = await submitToDatabase('meter', validationData.meter);
      console.log(`[METER] Created DB record: ${dbResult.id}`);
      
      // Now invoke the edge function to actually submit to OneBill API
      const { data: submitResponse, error: submitError } = await supabase.functions.invoke('onebill-submit', {
        body: {
          submissionId: dbResult.id,
          businessId: dbResult.business_id,
          documentType: 'meter',
          fields: validationData.meter,
          fileUrl: attachmentUrl,
          fileName: `meter_${Date.now()}.jpg`
        }
      });

      if (submitError) {
        throw new Error(`Edge function error: ${submitError.message}`);
      }

      console.log('[METER] OneBill API Response:', submitResponse);
      
      updateStep('submitMeter', { 
        status: 'success', 
        result: { dbRecord: dbResult, apiResponse: submitResponse }
      });
      
      toast({
        title: "Meter Submitted",
        description: `Submitted to OneBill API successfully (ID: ${dbResult.id})`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[METER] Submission error:', errorMsg);
      updateStep('submitMeter', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Meter Submission Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const step4SubmitGas = async () => {
    if (!validationData?.gas) {
      toast({
        variant: "destructive",
        title: "No Gas Data",
        description: "No gas bill found to submit",
      });
      return;
    }

    updateStep('submitGas', { status: 'loading' });
    
    try {
      const dbResult = await submitToDatabase('gas', validationData.gas);
      console.log(`[GAS] Created DB record: ${dbResult.id}`);
      
      // Now invoke the edge function to actually submit to OneBill API
      const { data: submitResponse, error: submitError } = await supabase.functions.invoke('onebill-submit', {
        body: {
          submissionId: dbResult.id,
          businessId: dbResult.business_id,
          documentType: 'gas',
          fields: validationData.gas,
          fileUrl: attachmentUrl,
          fileName: `gas_${Date.now()}.jpg`
        }
      });

      if (submitError) {
        throw new Error(`Edge function error: ${submitError.message}`);
      }

      console.log('[GAS] OneBill API Response:', submitResponse);
      
      updateStep('submitGas', { 
        status: 'success', 
        result: { dbRecord: dbResult, apiResponse: submitResponse }
      });
      
      toast({
        title: "Gas Submitted",
        description: `Submitted to OneBill API successfully (ID: ${dbResult.id})`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GAS] Submission error:', errorMsg);
      updateStep('submitGas', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Gas Submission Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const step5SubmitElectricity = async () => {
    if (!validationData?.electricity) {
      toast({
        variant: "destructive",
        title: "No Electricity Data",
        description: "No electricity bill found to submit",
      });
      return;
    }

    updateStep('submitElectricity', { status: 'loading' });
    
    try {
      const dbResult = await submitToDatabase('electricity', validationData.electricity);
      console.log(`[ELECTRICITY] Created DB record: ${dbResult.id}`);
      
      // Now invoke the edge function to actually submit to OneBill API
      const { data: submitResponse, error: submitError } = await supabase.functions.invoke('onebill-submit', {
        body: {
          submissionId: dbResult.id,
          businessId: dbResult.business_id,
          documentType: 'electricity',
          fields: validationData.electricity,
          fileUrl: attachmentUrl,
          fileName: `electricity_${Date.now()}.jpg`
        }
      });

      if (submitError) {
        throw new Error(`Edge function error: ${submitError.message}`);
      }

      console.log('[ELECTRICITY] OneBill API Response:', submitResponse);
      
      updateStep('submitElectricity', { 
        status: 'success', 
        result: { dbRecord: dbResult, apiResponse: submitResponse }
      });
      
      toast({
        title: "Electricity Submitted",
        description: `Submitted to OneBill API successfully (ID: ${dbResult.id})`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ELECTRICITY] Submission error:', errorMsg);
      updateStep('submitElectricity', { 
        status: 'error', 
        error: errorMsg 
      });
      
      toast({
        title: "Electricity Submission Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const runParseAndValidate = async () => {
    try {
      const parsed = await step1ParseDocument();
      await step2ValidateAndMap(parsed);
    } catch (error) {
      // Error already handled in individual steps
    }
  };

  const copyCurlCommand = (type: 'meter' | 'gas' | 'electricity') => {
    if (!validationData) return;

    let curl = '';
    if (type === 'meter' && validationData.meter) {
      const fields = validationData.meter;
      curl = `curl -X POST "https://api.onebill.ie/api/meter-file" \\
  -F "phone=${validationData.phone}" \\
  -F "utility=${fields.utility}" \\
  -F "read_value=${fields.read_value}" \\
  -F "unit=${fields.unit}" \\
  ${fields.meter_make ? `-F "meter_make=${fields.meter_make}" \\\n  ` : ''}${fields.meter_model ? `-F "meter_model=${fields.meter_model}" \\\n  ` : ''}${fields.confidence ? `-F "confidence=${fields.confidence}" \\\n  ` : ''}-F "file=@/path/to/photo.jpg"`;
    } else if (type === 'gas' && validationData.gas) {
      curl = `curl -X POST "https://api.onebill.ie/api/gas-file" \\
  -F "phone=${validationData.phone}" \\
  -F "gprn=${validationData.gas.gprn}" \\
  -F "file=@/path/to/bill.pdf"`;
    } else if (type === 'electricity' && validationData.electricity) {
      const fields = validationData.electricity;
      curl = `curl -X POST "https://api.onebill.ie/api/electricity-file" \\
  -F "phone=${validationData.phone}" \\
  -F "mprn=${fields.mprn}" \\
  ${fields.mcc_type ? `-F "mcc_type=${fields.mcc_type}" \\\n  ` : ''}${fields.dg_type ? `-F "dg_type=${fields.dg_type}" \\\n  ` : ''}-F "file=@/path/to/bill.pdf"`;
    }

    navigator.clipboard.writeText(curl);
    toast({
      title: "Copied",
      description: "cURL command copied to clipboard",
    });
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
          Step-by-step document processing with OpenAI support for PDFs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="steps" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="steps">Step-by-Step</TabsTrigger>
            <TabsTrigger value="curl">cURL Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="space-y-4">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button 
                onClick={stepAutoProcess} 
                disabled={Object.values(steps).some(s => s.status === 'loading')}
              >
                {steps.autoProcess.status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Auto Process (End-to-End)'
                )}
              </Button>
              <Button 
                onClick={runParseAndValidate} 
                variant="outline"
                disabled={Object.values(steps).some(s => s.status === 'loading')}
              >
                {steps.parse.status === 'loading' || steps.validate.status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Parse & Validate Only'
                )}
              </Button>
            </div>

            {Object.entries(steps).map(([key, step]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(step.status)}
                  <div className="flex-1">
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
                    if (key === 'autoProcess') stepAutoProcess();
                    else if (key === 'parse') step1ParseDocument();
                    else if (key === 'validate' && parsedData) step2ValidateAndMap(parsedData);
                    else if (key === 'submitMeter') step3SubmitMeter();
                    else if (key === 'submitGas') step4SubmitGas();
                    else if (key === 'submitElectricity') step5SubmitElectricity();
                  }}
                  disabled={
                    step.status === 'loading' ||
                    (key === 'validate' && !parsedData) ||
                    (key === 'submitMeter' && !validationData?.meter) ||
                    (key === 'submitGas' && !validationData?.gas) ||
                    (key === 'submitElectricity' && !validationData?.electricity)
                  }
                >
                  {step.status === 'loading' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Running
                    </>
                  ) : (
                    'Run'
                  )}
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="curl" className="space-y-4">
            {validationData ? (
              <>
                {validationData.meter && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Meter Reading API Call</h3>
                      <Button size="sm" variant="outline" onClick={() => copyCurlCommand('meter')}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
{`curl -X POST "https://api.onebill.ie/api/meter-file" \\
  -F "phone=${validationData.phone}" \\
  -F "utility=${validationData.meter.utility}" \\
  -F "read_value=${validationData.meter.read_value}" \\
  -F "unit=${validationData.meter.unit}" \\
  ${validationData.meter.meter_make ? `-F "meter_make=${validationData.meter.meter_make}" \\\n  ` : ''}${validationData.meter.meter_model ? `-F "meter_model=${validationData.meter.meter_model}" \\\n  ` : ''}-F "file=@/path/to/photo.jpg"`}
                    </pre>
                  </div>
                )}

                {validationData.gas && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Gas Bill API Call</h3>
                      <Button size="sm" variant="outline" onClick={() => copyCurlCommand('gas')}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
{`curl -X POST "https://api.onebill.ie/api/gas-file" \\
  -F "phone=${validationData.phone}" \\
  -F "gprn=${validationData.gas.gprn}" \\
  -F "file=@/path/to/bill.pdf"`}
                    </pre>
                  </div>
                )}

                {validationData.electricity && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Electricity Bill API Call</h3>
                      <Button size="sm" variant="outline" onClick={() => copyCurlCommand('electricity')}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
{`curl -X POST "https://api.onebill.ie/api/electricity-file" \\
  -F "phone=${validationData.phone}" \\
  -F "mprn=${validationData.electricity.mprn}" \\
  ${validationData.electricity.mcc_type ? `-F "mcc_type=${validationData.electricity.mcc_type}" \\\n  ` : ''}${validationData.electricity.dg_type ? `-F "dg_type=${validationData.electricity.dg_type}" \\\n  ` : ''}-F "file=@/path/to/bill.pdf"`}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Run "Parse & Validate" first to see cURL commands
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
