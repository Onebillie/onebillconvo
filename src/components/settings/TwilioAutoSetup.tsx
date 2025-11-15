import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useModalStore } from '@/stores/modalStore';
import { useState } from 'react';

interface TwilioAutoSetupProps {
  onSuccess: () => void;
}

export const TwilioAutoSetup = ({ onSuccess }: TwilioAutoSetupProps) => {
  const {
    twilioSetupOpen,
    twilioSetupState,
    setTwilioSetupOpen,
    setTwilioSetupState,
    resetTwilioSetup
  } = useModalStore();

  const { step, setupMethod, credentials, phoneOptions, error } = twilioSetupState;

  const [processing, setProcessing] = useState({
    validateCredentials: false,
    createTwimlApp: false,
    generateApiKey: false,
    purchasePhone: false,
    configureWebhooks: false
  });

  const handleMethodSelect = (method: 'auto' | 'manual') => {
    if (method === 'manual') {
      setTwilioSetupOpen(false);
      toast.info('Manual setup selected. Please enter your Twilio credentials manually.');
    } else {
      setTwilioSetupState({ setupMethod: method, step: 'credentials' });
    }
  };

  const handleCredentialsSubmit = () => {
    if (!credentials.accountSid || !credentials.authToken) {
      toast.error('Please enter both Account SID and Auth Token');
      return;
    }
    setTwilioSetupState({ step: 'phone' });
  };

  const handleSetupStart = async () => {
    setTwilioSetupState({ step: 'processing', error: null });
    
    try {
      // Step 1: Validate credentials
      setProcessing(prev => ({ ...prev, validateCredentials: true }));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Create TwiML app
      setProcessing(prev => ({ 
        ...prev, 
        validateCredentials: false,
        createTwimlApp: true 
      }));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Generate API key
      setProcessing(prev => ({ 
        ...prev, 
        createTwimlApp: false,
        generateApiKey: true 
      }));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Purchase phone (if requested)
      if (phoneOptions.purchasePhone) {
        setProcessing(prev => ({ 
          ...prev, 
          generateApiKey: false,
          purchasePhone: true 
        }));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 5: Configure webhooks
      setProcessing(prev => ({ 
        ...prev, 
        purchasePhone: false,
        configureWebhooks: true 
      }));

      // Call the edge function
      const { data, error: invokeError } = await supabase.functions.invoke('twilio-auto-setup', {
        body: {
          twilio_account_sid: credentials.accountSid,
          twilio_auth_token: credentials.authToken,
          country_code: phoneOptions.countryCode,
          purchase_phone: phoneOptions.purchasePhone,
          area_code: phoneOptions.areaCode || undefined
        }
      });

      if (invokeError) throw invokeError;

      if (!data.success) {
        throw new Error(data.error || 'Setup failed');
      }

      setTwilioSetupState({ 
        result: data.credentials,
        step: 'success'
      });
      setProcessing({
        validateCredentials: false,
        createTwimlApp: false,
        generateApiKey: false,
        purchasePhone: false,
        configureWebhooks: false
      });
      
      toast.success('Twilio setup completed successfully!');

    } catch (err: any) {
      console.error('Setup error:', err);
      setTwilioSetupState({ 
        error: err.message || 'An unexpected error occurred'
      });
      setProcessing({
        validateCredentials: false,
        createTwimlApp: false,
        generateApiKey: false,
        purchasePhone: false,
        configureWebhooks: false
      });
      toast.error('Setup failed: ' + (err.message || 'Please try again'));
    }
  };

  const handleFinish = () => {
    onSuccess();
    resetTwilioSetup();
    setTwilioSetupOpen(false);
  };

  return (
    <Dialog open={twilioSetupOpen} onOpenChange={setTwilioSetupOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Twilio Auto Setup
          </DialogTitle>
          <DialogDescription>
            Automatically configure Twilio for voice calling in minutes
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Choose Method */}
        {step === 'method' && (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <button
                onClick={() => handleMethodSelect('auto')}
                className="w-full p-6 border-2 rounded-lg text-left hover:border-primary hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-primary mt-0.5 flex items-center justify-center">
                    {setupMethod === 'auto' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Automatic Setup (Recommended)</h3>
                    <p className="text-sm text-muted-foreground">
                      We'll create everything for you: TwiML app, API keys, and optionally purchase a phone number
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleMethodSelect('manual')}
                className="w-full p-6 border-2 rounded-lg text-left hover:border-primary hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground mt-0.5 flex items-center justify-center">
                    {setupMethod === 'manual' && <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Manual Setup</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your existing Twilio credentials yourself
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enter Credentials */}
        {step === 'credentials' && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                Find these values in your{' '}
                <a 
                  href="https://console.twilio.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Twilio Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountSid">Account SID</Label>
                <Input
                  id="accountSid"
                  value={credentials.accountSid}
                  onChange={(e) => setTwilioSetupState({ 
                    credentials: { ...credentials, accountSid: e.target.value }
                  })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authToken">Auth Token</Label>
                <Input
                  id="authToken"
                  type="password"
                  value={credentials.authToken}
                  onChange={(e) => setTwilioSetupState({ 
                    credentials: { ...credentials, authToken: e.target.value }
                  })}
                  placeholder="Your Twilio Auth Token"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTwilioSetupState({ step: 'method' })}>
                Back
              </Button>
              <Button onClick={handleCredentialsSubmit}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Phone Options */}
        {step === 'phone' && (
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="purchasePhone"
                checked={phoneOptions.purchasePhone}
                onCheckedChange={(checked) => 
                  setTwilioSetupState({ 
                    phoneOptions: { ...phoneOptions, purchasePhone: checked as boolean }
                  })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="purchasePhone" className="font-semibold cursor-pointer">
                  Purchase a phone number for voice calls
                </Label>
                <p className="text-sm text-muted-foreground">
                  Cost: ~$1/month. You can skip this and add a number later.
                </p>
              </div>
            </div>

            {phoneOptions.purchasePhone && (
              <div className="pl-9 space-y-4">
                <Alert className="bg-muted/50">
                  <AlertDescription className="text-sm">
                    💾 Your edits are autosaved locally and will persist if you switch tabs
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={phoneOptions.countryCode}
                    onValueChange={(value) => setTwilioSetupState({ 
                      phoneOptions: { ...phoneOptions, countryCode: value }
                    })}
                  >
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="IE">Ireland</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaCode">Area Code (Optional)</Label>
                  <Input
                    id="areaCode"
                    value={phoneOptions.areaCode}
                    onChange={(e) => setTwilioSetupState({ 
                      phoneOptions: { ...phoneOptions, areaCode: e.target.value }
                    })}
                    placeholder="e.g., 353, 415"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTwilioSetupState({ step: 'credentials' })}>
                Back
              </Button>
              <Button onClick={handleSetupStart}>
                {phoneOptions.purchasePhone ? 'Purchase & Configure' : 'Configure'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && (
          <div className="space-y-4 py-8">
            {error && (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="flex justify-center">
                  <Button 
                    onClick={() => {
                      resetTwilioSetup();
                      setTwilioSetupState({ step: 'method' });
                    }}
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </>
            )}

            <div className="space-y-3">
              {[
                { key: 'validateCredentials', label: 'Validating credentials' },
                { key: 'createTwimlApp', label: 'Creating TwiML application' },
                { key: 'generateApiKey', label: 'Generating API keys' },
                ...(phoneOptions.purchasePhone ? [{ key: 'purchasePhone', label: 'Purchasing phone number' }] : []),
                { key: 'configureWebhooks', label: 'Configuring webhooks' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  {processing[key as keyof typeof processing] ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={processing[key as keyof typeof processing] ? 'font-medium' : 'text-muted-foreground'}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center mt-6">
              Please wait while we set up your Twilio integration...
            </p>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && twilioSetupState.result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>

            <h3 className="text-xl font-semibold text-center">Twilio is Ready!</h3>

            {twilioSetupState.result.phone_number && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Your phone number</p>
                <p className="text-2xl font-bold">{twilioSetupState.result.phone_number}</p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold mb-3">Configuration Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TwiML App:</span>
                  <span className="font-mono text-xs">{twilioSetupState.result.twiml_app_sid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key:</span>
                  <span className="font-mono text-xs">{twilioSetupState.result.api_key}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Webhooks:</span>
                  <span className="text-green-600">✓ Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recording:</span>
                  <span className="text-green-600">✓ Enabled</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={handleFinish}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
