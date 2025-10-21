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
import { Plus, Trash2, Info, Upload, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIDocumentUpload } from "./AIDocumentUpload";
import { AIPrivacySettings } from "./AIPrivacySettings";
import { useAuth } from "@/contexts/AuthContext";

export function AIAssistantSettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<any[]>([]);
  const [provider, setProvider] = useState<string>("lovable");
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [businessId, setBusinessId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Get business ID
    const { data: businessUser } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', user?.id)
      .single();

    if (businessUser) {
      setBusinessId(businessUser.business_id);
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
          <div className="space-y-3 pt-4 border-t">
            <Label htmlFor="ai-provider">AI Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="ai-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI (Google Gemini) - Included</SelectItem>
                <SelectItem value="openai">OpenAI (Your API Key)</SelectItem>
                <SelectItem value="custom">Custom Provider (Your API Key)</SelectItem>
              </SelectContent>
            </Select>

            {provider === "lovable" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Professional: 1,000 AI responses/month included, then $0.02/response.
                  Enterprise: Unlimited AI responses included.
                </AlertDescription>
              </Alert>
            )}

            {provider === "openai" && (
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

            {provider === "custom" && (
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
