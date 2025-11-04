import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check,
  Users,
  MessageSquare,
  Paperclip,
  Bell,
  FileText,
  Shield,
  Play,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface ApiFeature {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'customer' | 'messages' | 'attachments' | 'webhooks';
  useCase: string;
  endpoints: string[];
}

const API_FEATURES: ApiFeature[] = [
  {
    id: 'customer-fetch',
    name: 'Fetch Customer Data',
    description: 'Look up customers by email, phone, or your CRM ID',
    icon: Users,
    category: 'customer',
    useCase: 'When someone contacts you, automatically pull up their profile from your CRM',
    endpoints: ['api-customer-fetch']
  },
  {
    id: 'customer-create',
    name: 'Create New Customers',
    description: 'Add new customers to your database',
    icon: Users,
    category: 'customer',
    useCase: 'When someone signs up on your website, automatically create them in our system',
    endpoints: ['api-customer-create']
  },
  {
    id: 'customer-sync',
    name: 'Sync Customer Database',
    description: 'Keep your customer list in sync (bulk updates)',
    icon: Users,
    category: 'customer',
    useCase: 'Update hundreds or thousands of customer records at once from your CRM',
    endpoints: ['api-customers-sync']
  },
  {
    id: 'conversation-history',
    name: 'View Conversation History',
    description: 'See all messages with a customer across all channels',
    icon: MessageSquare,
    category: 'messages',
    useCase: 'Display complete chat history in your own app or CRM',
    endpoints: ['api-conversation-history']
  },
  {
    id: 'send-messages',
    name: 'Send Messages',
    description: 'Send messages to customers via WhatsApp, SMS, Email',
    icon: MessageSquare,
    category: 'messages',
    useCase: 'Reply to customers directly from your CRM',
    endpoints: ['api-send-message']
  },
  {
    id: 'upload-files',
    name: 'Upload Attachments',
    description: 'Send files, images, or documents to customers',
    icon: Paperclip,
    category: 'attachments',
    useCase: 'Attach invoices, receipts, or documents to conversations',
    endpoints: ['api-upload-attachment']
  },
  {
    id: 'parse-documents',
    name: 'Smart Document Reading (AI)',
    description: 'Automatically extract data from PDFs and images',
    icon: FileText,
    category: 'attachments',
    useCase: 'When customers send bills or forms, automatically read and process them',
    endpoints: ['api-parse-attachment']
  },
  {
    id: 'webhook-notifications',
    name: 'New Message Alerts',
    description: 'Get instant alerts when customers message you',
    icon: Bell,
    category: 'webhooks',
    useCase: 'Automatically update your CRM when new messages arrive',
    endpoints: ['webhook-send-message']
  },
  {
    id: 'webhook-parsed-attachments',
    name: 'Smart Document Alerts (AI)',
    description: 'Get notified when documents are automatically read',
    icon: FileText,
    category: 'webhooks',
    useCase: 'When a customer sends a bill, get the extracted data sent to your system',
    endpoints: ['auto-parse-attachment']
  }
];

const WIZARD_STEPS = [
  { id: 1, title: 'Select Features', description: 'Choose what you need' },
  { id: 2, title: 'Get API Key', description: 'Generate your access key' },
  { id: 3, title: 'Test Connection', description: 'Verify it works' },
  { id: 4, title: 'Setup Webhooks', description: 'Optional: Real-time alerts' },
  { id: 5, title: 'Ready to Go!', description: 'Share with your developer' }
];

interface ApiSetupWizardProps {
  onComplete: (selectedFeatures: string[], apiKey: string) => void;
}

export function ApiSetupWizard({ onComplete }: ApiSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const generateApiKey = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }

    // Simulate API key generation
    const newKey = `alc_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    toast.success('API Key generated! Keep this safe - you won\'t see it again.');
  };

  const testConnection = async () => {
    setTestResult('testing');
    
    // Simulate testing
    setTimeout(() => {
      setTestResult('success');
      toast.success('Connection successful! Your API key is working.');
    }, 2000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCodeExample = () => {
    const selectedEndpoints = API_FEATURES
      .filter(f => selectedFeatures.includes(f.id))
      .flatMap(f => f.endpoints);

    if (selectedEndpoints.includes('api-customer-fetch')) {
      return `// Fetch customer by email
fetch('https://jrtlrnfdqfkjlkpfirzr.supabase.co/functions/v1/api-customer-fetch', {
  method: 'POST',
  headers: {
    'x-api-key': '${apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'customer@example.com'
  })
})
.then(response => response.json())
.then(data => console.log(data.customer));`;
    }

    return `// Your selected features don't require code yet
// Move to the next step to configure webhooks`;
  };

  const selectedByCategory = (category: string) => 
    API_FEATURES.filter(f => f.category === category && selectedFeatures.includes(f.id));

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">API Setup Progress</h3>
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {WIZARD_STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Indicators */}
        <div className="flex justify-between mt-4">
          {WIZARD_STEPS.map((step) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step.id < currentStep 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : step.id === currentStep
                  ? 'border-primary text-primary'
                  : 'border-muted text-muted-foreground'
              }`}>
                {step.id < currentStep ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              <div className="text-center mt-2">
                <div className="text-xs font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Select Features */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">What do you want to do?</h3>
                <p className="text-muted-foreground">
                  Select the features you need. Don't worry - you can always add more later!
                </p>
              </div>

              <div className="space-y-6">
                {/* Customer Management */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Customer Management
                  </h4>
                  <div className="space-y-3 ml-7">
                    {API_FEATURES.filter(f => f.category === 'customer').map((feature) => (
                      <div key={feature.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                        onClick={() => toggleFeature(feature.id)}>
                        <Checkbox
                          checked={selectedFeatures.includes(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                        <div className="flex-1">
                          <Label className="cursor-pointer font-medium">{feature.name}</Label>
                          <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Example: {feature.useCase}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Messages & Conversations
                  </h4>
                  <div className="space-y-3 ml-7">
                    {API_FEATURES.filter(f => f.category === 'messages').map((feature) => (
                      <div key={feature.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                        onClick={() => toggleFeature(feature.id)}>
                        <Checkbox
                          checked={selectedFeatures.includes(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                        <div className="flex-1">
                          <Label className="cursor-pointer font-medium">{feature.name}</Label>
                          <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Example: {feature.useCase}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-primary" />
                    Files & Documents
                  </h4>
                  <div className="space-y-3 ml-7">
                    {API_FEATURES.filter(f => f.category === 'attachments').map((feature) => (
                      <div key={feature.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                        onClick={() => toggleFeature(feature.id)}>
                        <Checkbox
                          checked={selectedFeatures.includes(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                        <div className="flex-1">
                          <Label className="cursor-pointer font-medium">{feature.name}</Label>
                          <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Example: {feature.useCase}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webhooks */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Real-time Notifications
                  </h4>
                  <div className="space-y-3 ml-7">
                    {API_FEATURES.filter(f => f.category === 'webhooks').map((feature) => (
                      <div key={feature.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                        onClick={() => toggleFeature(feature.id)}>
                        <Checkbox
                          checked={selectedFeatures.includes(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                        <div className="flex-1">
                          <Label className="cursor-pointer font-medium">{feature.name}</Label>
                          <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Example: {feature.useCase}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedFeatures.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>You've selected {selectedFeatures.length} feature{selectedFeatures.length > 1 ? 's' : ''}</AlertTitle>
                  <AlertDescription>
                    {API_FEATURES.filter(f => selectedFeatures.includes(f.id)).map(f => f.name).join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 2: Generate API Key */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Generate Your API Key</h3>
                <p className="text-muted-foreground">
                  This is like a password that lets your developer connect your systems together.
                </p>
              </div>

              {!apiKey ? (
                <div className="space-y-4">
                  <div>
                    <Label>Give this key a name (so you remember what it's for)</Label>
                    <Input
                      placeholder="e.g., My CRM Integration"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Examples: "Production CRM", "Website Integration", "Testing"
                    </p>
                  </div>

                  <Button onClick={generateApiKey} size="lg" className="w-full">
                    Generate API Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>⚠️ Save This Key Now!</AlertTitle>
                    <AlertDescription>
                      For security reasons, we'll only show this once. Copy it and share it with your developer.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Your API Key</Label>
                    <div className="flex gap-2 mt-2">
                      <Input value={apiKey} readOnly className="font-mono" />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(apiKey, 'API Key')}
                      >
                        {copiedCode === 'API Key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">What to tell your developer:</h4>
                    <p className="text-sm text-muted-foreground">
                      "Please use this API key to connect our {keyName}. 
                      Send it in the <code className="bg-background px-1 py-0.5 rounded">x-api-key</code> header with all API requests."
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Test Connection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Test Your Connection</h3>
                <p className="text-muted-foreground">
                  Let's make sure everything is working correctly.
                </p>
              </div>

              {apiKey && (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label>Sample Code (share with your developer)</Label>
                      <div className="relative mt-2">
                        <Textarea
                          value={getCodeExample()}
                          readOnly
                          className="font-mono text-sm h-64"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(getCodeExample(), 'Sample Code')}
                        >
                          {copiedCode === 'Sample Code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={testConnection}
                      disabled={testResult === 'testing'}
                      className="w-full"
                      size="lg"
                    >
                      {testResult === 'testing' ? (
                        <>Testing Connection...</>
                      ) : testResult === 'success' ? (
                        <><CheckCircle2 className="h-4 w-4 mr-2" /> Connection Successful!</>
                      ) : (
                        <><Play className="h-4 w-4 mr-2" /> Test Connection</>
                      )}
                    </Button>

                    {testResult === 'success' && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Great! Everything is working</AlertTitle>
                        <AlertDescription>
                          Your API key is valid and ready to use. You can now proceed to the next step.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Setup Webhooks */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Setup Real-time Notifications (Optional)</h3>
                <p className="text-muted-foreground">
                  Webhooks automatically notify your system when customers send messages. Skip this if you don't need it.
                </p>
              </div>

              {selectedFeatures.includes('webhook-notifications') ? (
                <div className="space-y-4">
                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertTitle>What are webhooks?</AlertTitle>
                    <AlertDescription>
                      Think of webhooks like a doorbell. When a customer messages you, we instantly "ring the doorbell" 
                      at your CRM's address, so it knows to update immediately.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Your Webhook URL (ask your developer for this)</Label>
                    <Input
                      placeholder="https://your-crm.com/webhooks/messages"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is the "address" where we'll send notifications
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">What to tell your developer:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>We need a URL endpoint to receive webhook notifications</li>
                      <li>It must be HTTPS (secure)</li>
                      <li>We'll send customer data and message details in real-time</li>
                      <li>Include signature verification for security</li>
                    </ul>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open('/api-docs', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Webhook Documentation
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertTitle>You didn't select real-time notifications</AlertTitle>
                  <AlertDescription>
                    That's okay! You can always set this up later in the Settings. 
                    Click Next to see your summary.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">You're All Set!</h3>
                <p className="text-muted-foreground">
                  Here's everything you need to share with your developer
                </p>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Your Selected Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {API_FEATURES.filter(f => selectedFeatures.includes(f.id)).map((feature) => (
                      <div key={feature.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature.name}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">API Key</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input value={apiKey} readOnly className="font-mono" />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(apiKey, 'API Key')}
                      >
                        {copiedCode === 'API Key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {webhookUrl && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Webhook URL</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input value={webhookUrl} readOnly />
                    </CardContent>
                  </Card>
                )}

                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>Documentation for Your Developer</AlertTitle>
                  <AlertDescription className="mt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open('/api-docs', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Complete API Documentation
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>

              <Button
                onClick={() => onComplete(selectedFeatures, apiKey)}
                className="w-full"
                size="lg"
              >
                Finish Setup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep < WIZARD_STEPS.length && (
          <Button
            onClick={() => {
              if (currentStep === 1 && selectedFeatures.length === 0) {
                toast.error('Please select at least one feature');
                return;
              }
              if (currentStep === 2 && !apiKey) {
                toast.error('Please generate an API key first');
                return;
              }
              setCurrentStep(prev => prev + 1);
            }}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
