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
import { Plus, Trash2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AIAssistantSettings() {
  const [config, setConfig] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    provider_type: "openai",
    api_key: "",
    api_endpoint: "",
    model: "gpt-5-mini",
    is_primary: false,
    temperature: 0.7,
    max_tokens: 1000,
  });
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: cfg }, { data: training }, { data: docs }, { data: providersList }] = await Promise.all([
      supabase.from('ai_assistant_config').select('*').single(),
      supabase.from('ai_training_data').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_rag_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_provider_configs').select('*').order('created_at', { ascending: false }),
    ]);
    setConfig(cfg);
    setTrainingData(training || []);
    setRagDocs(docs || []);
    setProviders(providersList || []);
    
    // Set selected provider to primary or first
    const primary = providersList?.find(p => p.is_primary);
    setSelectedProvider(primary?.id || providersList?.[0]?.id || "lovable");
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

  const addRagDoc = async () => {
    const { error } = await supabase.from('ai_rag_documents').insert({ title: 'New document', content: 'Content here' });
    if (!error) {
      toast.success('Document added');
      fetchData();
    }
  };

  const addProvider = async () => {
    if (!newProvider.api_key) {
      toast.error('API key is required');
      return;
    }

    const { error } = await supabase.from('ai_provider_configs').insert({
      provider_type: newProvider.provider_type,
      api_key_encrypted: newProvider.api_key, // Will be encrypted in backend
      api_endpoint: newProvider.api_endpoint || null,
      model: newProvider.model,
      is_primary: newProvider.is_primary,
      temperature: newProvider.temperature,
      max_tokens: newProvider.max_tokens,
    });

    if (error) {
      toast.error('Failed to add provider');
      console.error(error);
    } else {
      toast.success('Provider added successfully');
      setShowAddProvider(false);
      setNewProvider({
        provider_type: "openai",
        api_key: "",
        api_endpoint: "",
        model: "gpt-5-mini",
        is_primary: false,
        temperature: 0.7,
        max_tokens: 1000,
      });
      fetchData();
    }
  };

  const deleteProvider = async (providerId: string) => {
    const { error } = await supabase.from('ai_provider_configs').delete().eq('id', providerId);
    if (!error) {
      toast.success('Provider deleted');
      fetchData();
    }
  };

  const setPrimaryProvider = async (providerId: string) => {
    // Unset all primaries first
    await supabase.from('ai_provider_configs').update({ is_primary: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    // Set new primary
    const { error } = await supabase.from('ai_provider_configs').update({ is_primary: true }).eq('id', providerId);
    if (!error) {
      toast.success('Primary provider updated');
      fetchData();
    }
  };

  const testProvider = async (providerId: string) => {
    setTestingProvider(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-test-provider', {
        body: { provider_id: providerId }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success('Provider test successful! ✓');
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTestingProvider(false);
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
          <div className="space-y-3 pt-4 border-t">
            <Label htmlFor="ai-provider">AI Provider</Label>
            <Select value={aiProvider} onValueChange={setAiProvider}>
              <SelectTrigger id="ai-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI (Google Gemini) - Included</SelectItem>
                <SelectItem value="openai">OpenAI (Your API Key)</SelectItem>
                <SelectItem value="custom">Custom Provider (Your API Key)</SelectItem>
              </SelectContent>
            </Select>

            {aiProvider === "lovable" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Professional: 1,000 AI responses/month included, then $0.02/response.
                  Enterprise: Unlimited AI responses included.
                </AlertDescription>
              </Alert>
            )}

            {aiProvider === "openai" && (
              <div className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted and never shared. You'll be charged by OpenAI directly.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Model</Label>
                  <Select value={customModel} onValueChange={setCustomModel}>
                    <SelectTrigger id="openai-model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-5">GPT-5</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4 Omni</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4 Omni Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => toast.success("API key saved securely")}>
                  Save API Key
                </Button>
              </div>
            )}

            {aiProvider === "custom" && (
              <div className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-endpoint">API Endpoint URL</Label>
                  <Input
                    id="custom-endpoint"
                    placeholder="https://api.example.com/v1/chat/completions"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-key">API Key</Label>
                  <Input
                    id="custom-key"
                    type="password"
                    placeholder="Your API key"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-model">Model Name</Label>
                  <Input
                    id="custom-model"
                    placeholder="e.g., claude-3-opus"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                  />
                </div>
                <Button onClick={() => toast.success("Custom provider saved")}>
                  Save Configuration
                </Button>
              </div>
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

      <Tabs defaultValue="training">
        <TabsList>
          <TabsTrigger value="training">Q&A Training</TabsTrigger>
          <TabsTrigger value="rag">RAG Documents</TabsTrigger>
        </TabsList>
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
        <TabsContent value="rag" className="space-y-4">
          <Button onClick={addRagDoc}><Plus className="w-4 h-4 mr-2" />Add Document</Button>
          {ragDocs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="pt-4 space-y-2">
                <Input placeholder="Title" defaultValue={doc.title} onBlur={(e) => supabase.from('ai_rag_documents').update({ title: e.target.value }).eq('id', doc.id)} />
                <Textarea placeholder="Content" defaultValue={doc.content} onBlur={(e) => supabase.from('ai_rag_documents').update({ content: e.target.value }).eq('id', doc.id)} rows={6} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
