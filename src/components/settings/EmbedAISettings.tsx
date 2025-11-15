import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard";

interface Department {
  name: string;
  keywords: string[];
}

export function EmbedAISettings({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    ai_triage_enabled: false,
    ai_first_response_enabled: false,
    departments: [] as Department[],
    system_prompt: 'Hello! How can we help you today?'
  });
  const [initialData, setInitialData] = useState<any>(null);

  const hasUnsavedChanges = initialData 
    ? JSON.stringify(settings) !== JSON.stringify(initialData)
    : false;

  const { loadSavedData, clearSavedData } = useFormAutosave({
    key: `embed-ai-settings-${businessId}`,
    values: settings,
    enabled: !loading,
    debounceMs: 1000
  });

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  const loadSettings = async () => {
    const draft = loadSavedData();
    
    const { data } = await supabase
      .from('embed_ai_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();
    
    if (data) {
      const loadedData = {
        ai_triage_enabled: data.ai_triage_enabled,
        ai_first_response_enabled: data.ai_first_response_enabled,
        departments: (data.departments as any) || [],
        system_prompt: data.system_prompt
      };
      
      if (draft && 'ai_triage_enabled' in draft) {
        setSettings(draft as typeof settings);
        toast({ title: 'Draft restored' });
      } else {
        setSettings(loadedData);
      }
      setInitialData(loadedData);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('embed_ai_settings')
      .upsert({ 
        business_id: businessId,
        ai_triage_enabled: settings.ai_triage_enabled,
        ai_first_response_enabled: settings.ai_first_response_enabled,
        departments: settings.departments as any,
        system_prompt: settings.system_prompt
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      clearSavedData();
      setInitialData(settings);
      toast({ title: "Success", description: "AI settings saved" });
    }
    setLoading(false);
  };

  const addDepartment = () => {
    setSettings({
      ...settings,
      departments: [...settings.departments, { name: '', keywords: [] }]
    });
  };

  const removeDepartment = (index: number) => {
    const newDepts = [...settings.departments];
    newDepts.splice(index, 1);
    setSettings({ ...settings, departments: newDepts });
  };

  const updateDepartment = (index: number, field: 'name' | 'keywords', value: any) => {
    const newDepts = [...settings.departments];
    newDepts[index][field] = value;
    setSettings({ ...settings, departments: newDepts });
  };

  return (
    <>
      <UnsavedChangesGuard hasUnsavedChanges={hasUnsavedChanges} />
      <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="ai-triage" className="text-base">Enable AI Triage</Label>
          <p className="text-sm text-muted-foreground">Automatically analyze and route incoming messages</p>
        </div>
        <Switch 
          id="ai-triage"
          checked={settings.ai_triage_enabled}
          onCheckedChange={(checked) => setSettings({...settings, ai_triage_enabled: checked})}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="ai-auto-respond" className="text-base">Enable Auto-Response</Label>
          <p className="text-sm text-muted-foreground">AI will generate and send initial responses automatically</p>
        </div>
        <Switch 
          id="ai-auto-respond"
          checked={settings.ai_first_response_enabled}
          onCheckedChange={(checked) => setSettings({...settings, ai_first_response_enabled: checked})}
        />
      </div>

      <div>
        <Label>System Prompt</Label>
        <Textarea 
          value={settings.system_prompt}
          onChange={(e) => setSettings({...settings, system_prompt: e.target.value})}
          placeholder="You are a helpful customer service assistant..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Departments</Label>
          <Button onClick={addDepartment} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Department
          </Button>
        </div>

        {settings.departments.map((dept, index) => (
          <Card key={index} className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Department Name</Label>
                  <Input 
                    value={dept.name}
                    onChange={(e) => updateDepartment(index, 'name', e.target.value)}
                    placeholder="e.g., Sales, Support, Billing"
                  />
                </div>
                <div>
                  <Label>Keywords (comma-separated)</Label>
                  <Input 
                    value={dept.keywords.join(', ')}
                    onChange={(e) => updateDepartment(index, 'keywords', e.target.value.split(',').map(k => k.trim()))}
                    placeholder="e.g., pricing, quote, buy"
                  />
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => removeDepartment(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Saving..." : "Save AI Settings"}
      </Button>
    </Card>
    </>
  );
}
