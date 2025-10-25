import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, DollarSign, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function VoiceBillingTest() {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState({
    duration: 300, // 5 minutes
    direction: 'inbound' as 'inbound' | 'outbound',
    hasRecording: true,
    hasTranscription: false,
  });
  const [results, setResults] = useState<any>(null);

  const testPreCallCheck = async () => {
    setTesting(true);
    setResults(null);

    try {
      // Get business ID
      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user?.id)
        .single();

      if (!businessUser) {
        throw new Error('Business not found');
      }

      // Test pre-call credit check
      const { data, error } = await supabase.functions.invoke('pre-call-credit-check', {
        body: {
          business_id: businessUser.business_id,
          direction: testData.direction,
          estimated_duration_minutes: testData.duration / 60,
        },
      });

      if (error) throw error;

      setResults({
        type: 'pre-call-check',
        data,
      });

      toast.success('Pre-call check completed');
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(error.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const testCostCalculation = async () => {
    setTesting(true);
    setResults(null);

    try {
      // Get business ID
      const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user?.id)
        .single();

      if (!businessUser) {
        throw new Error('Business not found');
      }

      // Create a test call record
      const { data: callRecord, error: callError } = await supabase
        .from('call_records')
        .insert([{
          business_id: businessUser.business_id,
          from_number: testData.direction === 'inbound' ? '+15551234567' : '+15559876543',
          to_number: testData.direction === 'inbound' ? '+15559876543' : '+15551234567',
          direction: testData.direction,
          status: 'completed',
          duration_seconds: testData.duration,
          recording_url: testData.hasRecording ? 'https://test.com/recording.mp3' : null,
          transcript: testData.hasTranscription ? 'Test transcript content' : null,
          twilio_call_sid: `TEST_${Date.now()}`,
        }])
        .select()
        .single();

      if (callError) throw callError;

      // Calculate cost
      const { data: costData, error: costError } = await supabase.functions.invoke('calculate-call-cost', {
        body: {
          call_record_id: callRecord.id,
        },
      });

      if (costError) throw costError;

      // If billable, test credit deduction
      let deductionData = null;
      if (costData && !costData.withinPlanLimit && costData.billableAmount > 0) {
        const { data: deduction, error: deductError } = await supabase.functions.invoke('deduct-call-credits', {
          body: {
            business_id: businessUser.business_id,
            cost_cents: costData.billableAmount,
            call_record_id: callRecord.id,
            duration_minutes: costData.durationMinutes,
          },
        });

        if (deductError) {
          console.warn('Credit deduction warning:', deductError);
        } else {
          deductionData = deduction;
        }
      }

      setResults({
        type: 'cost-calculation',
        callRecord,
        costData,
        deductionData,
      });

      toast.success('Cost calculation completed');
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(error.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const testUsageAggregation = async () => {
    setTesting(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('aggregate-voice-usage', {
        body: {
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
        },
      });

      if (error) throw error;

      setResults({
        type: 'aggregation',
        data,
      });

      toast.success('Usage aggregation completed');
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(error.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Voice Billing System Test</h1>
        <p className="text-muted-foreground">
          Test the voice calling pricing and billing system
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure test call parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Call Duration (seconds)</Label>
              <Input
                type="number"
                value={testData.duration}
                onChange={(e) => setTestData({ ...testData, duration: parseInt(e.target.value) })}
                min={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(testData.duration / 60).toFixed(1)} minutes
              </p>
            </div>

            <div>
              <Label>Direction</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={testData.direction === 'inbound' ? 'default' : 'outline'}
                  onClick={() => setTestData({ ...testData, direction: 'inbound' })}
                  className="flex-1"
                >
                  Inbound
                </Button>
                <Button
                  variant={testData.direction === 'outbound' ? 'default' : 'outline'}
                  onClick={() => setTestData({ ...testData, direction: 'outbound' })}
                  className="flex-1"
                >
                  Outbound
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recording"
                checked={testData.hasRecording}
                onChange={(e) => setTestData({ ...testData, hasRecording: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="recording">Include Recording</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="transcription"
                checked={testData.hasTranscription}
                onChange={(e) => setTestData({ ...testData, hasTranscription: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="transcription">Include Transcription</Label>
            </div>
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>Run different billing tests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={testPreCallCheck}
              disabled={testing}
              className="w-full justify-start"
              variant="outline"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Test Pre-Call Credit Check
            </Button>

            <Button
              onClick={testCostCalculation}
              disabled={testing}
              className="w-full justify-start"
              variant="outline"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4 mr-2" />
              )}
              Test Cost Calculation & Deduction
            </Button>

            <Button
              onClick={testUsageAggregation}
              disabled={testing}
              className="w-full justify-start"
              variant="outline"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Test Usage Aggregation
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {results && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.type === 'pre-call-check' && (
                <>
                  <div className="flex items-center gap-2">
                    {results.data.allowed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {results.data.allowed ? 'Call Allowed' : 'Call Blocked'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Within Plan Limit</p>
                      <p className="font-semibold">{results.data.withinPlanLimit ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining Minutes</p>
                      <p className="font-semibold">{results.data.remainingIncludedMinutes}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Cost</p>
                      <p className="font-semibold">${(results.data.estimatedCostCents / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Credits</p>
                      <p className="font-semibold">{results.data.currentCredits} min</p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm">{results.data.message}</p>
                  </div>
                </>
              )}

              {results.type === 'cost-calculation' && (
                <>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">{results.costData.durationMinutes.toFixed(2)} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Twilio Cost</p>
                      <p className="font-semibold">${(results.costData.twilioBaseCost / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Our Markup</p>
                      <p className="font-semibold">${(results.costData.ourMarkup / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Cost:</span>
                      <Badge variant="default" className="text-lg">
                        ${(results.costData.totalCost / 100).toFixed(2)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-muted-foreground">Billable Amount:</span>
                      <span className="font-semibold">
                        ${(results.costData.billableAmount / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-muted-foreground">Within Plan:</span>
                      <Badge variant={results.costData.withinPlanLimit ? "secondary" : "destructive"}>
                        {results.costData.withinPlanLimit ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>

                  {results.deductionData && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="font-semibold mb-2">Credit Deduction:</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Previous Balance:</span>
                          <span>{results.deductionData.previousBalance} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credits Deducted:</span>
                          <span>-{results.deductionData.creditsDeducted} min</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>New Balance:</span>
                          <span>{results.deductionData.newBalance} min</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-48">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </>
              )}

              {results.type === 'aggregation' && (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-semibold mb-2">Aggregation Summary:</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Calls Processed:</span>
                        <span>{results.data.callsProcessed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Businesses Updated:</span>
                        <span>{results.data.results?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                    {JSON.stringify(results.data, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
