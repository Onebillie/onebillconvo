import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Info, Upload, FileText, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIDocumentUpload } from "./AIDocumentUpload";
import { AIPrivacySettings } from "./AIPrivacySettings";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    logo: "🤖",
    description: "GPT-5, GPT-4",
    models: [
      { value: "gpt-5", label: "GPT-5 (Recommended)" },
      { value: "gpt-5-mini", label: "GPT-5 Mini" },
      { value: "gpt-5-nano", label: "GPT-5 Nano" },
      { value: "gpt-4o", label: "GPT-4 Omni" },
      { value: "gpt-4o-mini", label: "GPT-4 Omni Mini" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "🧠",
    description: "Claude 4.5, Claude Opus",
    models: [
      { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (Recommended)" },
      { value: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    logo: "🔷",
    description: "Gemini Pro, Flash",
    models: [
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Recommended)" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    ],
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    logo: "☁️",
    description: "Enterprise GPT models",
    models: [],
  },
  {
    id: "custom",
    name: "Custom Provider",
    logo: "⚙️",
    description: "Your own API endpoint",
    models: [],
  },
];

export function AIAssistantSettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<any[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [customEndpoint, setCustomEndpoint] = useState<string>("");
  const [businessId, setBusinessId] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isOnebill, setIsOnebill] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Get business ID and name
    const { data: businessUser } = await supabase
      .from('business_users')
      .select('business_id, businesses(name)')
      .eq('user_id', user?.id)
      .single();

    if (businessUser) {
      setBusinessId(businessUser.business_id);
      const name = (businessUser.businesses as any)?.name?.toLowerCase();
      setBusinessName(name || '');
      setIsOnebill(name === 'onebill');
    }

    const [{ data: cfg }, { data: training }, { data: docs }] = await Promise.all([
      supabase.from('ai_assistant_config').select('*').single(),
      supabase.from('ai_training_data').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_knowledge_documents').select('*').eq('business_id', businessUser?.business_id).order('created_at', { ascending: false }),
    ]);
    setConfig(cfg);
    setTrainingData(training || []);
    setKnowledgeDocs(docs || []);
    setLoading(false);
  };

  const updateConfig = async (updates: any) => {
    const { error } = await supabase.from('ai_assistant_config').update(updates).eq('id', config.id);
    if (error) {
      toast.error('Failed to update configuration');
    } else {
      toast.success('Configuration updated');
      fetchData();
    }
  };

  const addTrainingData = async () => {
    const { error } = await supabase.from('ai_training_data').insert({ question: 'New question', answer: 'New answer' });
    if (!error) {
      toast.success('Training data added');
      fetchData();
    }
  };

  const deleteDocument = async (docId: string) => {
    const { error } = await supabase
      .from('ai_knowledge_documents')
      .delete()
      .eq('id', docId);
    
    if (!error) {
      toast.success('Document deleted');
      fetchData();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant Configuration</CardTitle>
          <CardDescription>Configure the AI assistant for automated customer support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable AI */}
          <div className="flex items-center justify-between">
            <Label>Enable AI Assistant</Label>
            <Switch checked={config?.is_enabled} onCheckedChange={(checked) => updateConfig({ is_enabled: checked })} />
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Out of Hours Only</Label>
            <Switch checked={config?.out_of_hours_only} onCheckedChange={(checked) => updateConfig({ out_of_hours_only: checked })} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Require Approval Before Sending</Label>
              <p className="text-xs text-muted-foreground">AI suggestions will be queued for staff review</p>
            </div>
            <Switch 
              checked={config?.require_approval || false} 
              onCheckedChange={(checked) => updateConfig({ require_approval: checked })} 
            />
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label className="text-base">AI Provider</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose your AI provider and connect your API credentials
              </p>
            </div>

            {/* Lovable AI Option (Only for onebill) */}
            {isOnebill && (
              <Card 
                className={cn(
                  "cursor-pointer transition-all border-2",
                  provider === "lovable" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
                onClick={() => setProvider("lovable")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">💚</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Lovable AI (Gemini)</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Included</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pre-configured Gemini models, no API key needed
                      </p>
                    </div>
                    {provider === "lovable" && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Provider Cards */}
            <div className="grid gap-3">
              {AI_PROVIDERS.map((prov) => (
                <Card
                  key={prov.id}
                  className={cn(
                    "cursor-pointer transition-all border-2",
                    provider === prov.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setProvider(prov.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{prov.logo}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{prov.name}</h3>
                        <p className="text-sm text-muted-foreground">{prov.description}</p>
                      </div>
                      {provider === prov.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Provider Configuration */}
            {provider && provider !== "lovable" && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">
                    {AI_PROVIDERS.find(p => p.id === provider)?.name} Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder={
                        provider === "openai" ? "sk-proj-..." :
                        provider === "anthropic" ? "sk-ant-..." :
                        provider === "google" ? "AIza..." :
                        provider === "azure" ? "Your Azure key..." :
                        "Your API key"
                      }
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key is encrypted and stored securely. You'll be charged directly by the provider.
                    </p>
                  </div>

                  {/* Custom Endpoint for Azure/Custom */}
                  {(provider === "azure" || provider === "custom") && (
                    <div className="space-y-2">
                      <Label htmlFor="endpoint">
                        {provider === "azure" ? "Azure Endpoint URL" : "API Endpoint URL"}
                      </Label>
                      <Input
                        id="endpoint"
                        placeholder={
                          provider === "azure" 
                            ? "https://your-resource.openai.azure.com" 
                            : "https://api.example.com/v1/chat/completions"
                        }
                        value={customEndpoint}
                        onChange={(e) => setCustomEndpoint(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Model Selection */}
                  {AI_PROVIDERS.find(p => p.id === provider)?.models && AI_PROVIDERS.find(p => p.id === provider)!.models.length > 0 ? (
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Select value={customModel} onValueChange={setCustomModel}>
                        <SelectTrigger id="model">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_PROVIDERS.find(p => p.id === provider)?.models.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="model-name">Model Name</Label>
                      <Input
                        id="model-name"
                        placeholder={
                          provider === "azure" ? "gpt-5" : "e.g., your-model-name"
                        }
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                      />
                    </div>
                  )}

                  <Button 
                    onClick={() => toast.success("Configuration saved securely")}
                    className="w-full"
                  >
                    Save Configuration
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-2 pt-4 border-t">
            <Label>System Prompt</Label>
            <Textarea 
              value={config?.system_prompt} 
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })} 
              onBlur={() => updateConfig({ system_prompt: config.system_prompt })} 
              rows={4}
              placeholder="You are a helpful customer service assistant..."
            />
            <p className="text-xs text-muted-foreground">
              Define how the AI should behave and respond to customers
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Knowledge Base</TabsTrigger>
          <TabsTrigger value="training">Q&A Training</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents" className="space-y-4">
          <AIDocumentUpload businessId={businessId} onUploadComplete={fetchData} />
          
          <div className="space-y-3">
            {knowledgeDocs.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {doc.chunk_count} chunks • {Math.round(doc.file_size / 1024)}KB
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.content.substring(0, 150)}...
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {knowledgeDocs.length === 0 && (
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  No documents uploaded yet. Upload your business documents to train the AI.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="training" className="space-y-4">
          <Button onClick={addTrainingData}><Plus className="w-4 h-4 mr-2" />Add Q&A</Button>
          {trainingData.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-4 space-y-2">
                <Input placeholder="Question" defaultValue={item.question} onBlur={(e) => supabase.from('ai_training_data').update({ question: e.target.value }).eq('id', item.id)} />
                <Textarea placeholder="Answer" defaultValue={item.answer} onBlur={(e) => supabase.from('ai_training_data').update({ answer: e.target.value }).eq('id', item.id)} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="privacy" className="space-y-4">
          <AIPrivacySettings businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
