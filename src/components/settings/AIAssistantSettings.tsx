import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export function AIAssistantSettings() {
  const [config, setConfig] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: cfg }, { data: training }, { data: docs }] = await Promise.all([
      supabase.from('ai_assistant_config').select('*').single(),
      supabase.from('ai_training_data').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_rag_documents').select('*').order('created_at', { ascending: false }),
    ]);
    setConfig(cfg);
    setTrainingData(training || []);
    setRagDocs(docs || []);
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant Configuration</CardTitle>
          <CardDescription>Configure the AI assistant for automated customer support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable AI Assistant</Label>
            <Switch checked={config?.is_enabled} onCheckedChange={(checked) => updateConfig({ is_enabled: checked })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Out of Hours Only</Label>
            <Switch checked={config?.out_of_hours_only} onCheckedChange={(checked) => updateConfig({ out_of_hours_only: checked })} />
          </div>
          <div className="space-y-2">
            <Label>System Prompt</Label>
            <Textarea value={config?.system_prompt} onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })} onBlur={() => updateConfig({ system_prompt: config.system_prompt })} rows={4} />
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
