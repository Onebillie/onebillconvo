import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIPrivacySettingsProps {
  businessId: string;
}

export function AIPrivacySettings({ businessId }: AIPrivacySettingsProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [businessId]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('ai_privacy_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (data) {
      setSettings(data);
    } else if (error?.code === 'PGRST116') {
      // No settings yet, create default
      const { data: newSettings } = await supabase
        .from('ai_privacy_settings')
        .insert({ business_id: businessId })
        .select()
        .single();
      setSettings(newSettings);
    }
    setLoading(false);
  };

  const updateSettings = async (updates: any) => {
    const { error } = await supabase
      .from('ai_privacy_settings')
      .update(updates)
      .eq('id', settings.id);

    if (error) {
      toast.error('Failed to update privacy settings');
    } else {
      toast.success('Privacy settings updated');
      fetchSettings();
    }
  };

  if (loading) return <div>Loading privacy settings...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Privacy & Compliance</CardTitle>
          </div>
          <CardDescription>
            Configure data protection, GDPR compliance, and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Closed Dataset Mode */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Closed Dataset Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Only respond from uploaded documents. Refuse if answer not in knowledge base.
                </p>
              </div>
              <Switch
                checked={settings?.closed_dataset_mode || false}
                onCheckedChange={(checked) => updateSettings({ closed_dataset_mode: checked })}
              />
            </div>
            {settings?.closed_dataset_mode && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  AI will only use your uploaded documents. It will politely refuse questions outside this scope.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Require High Confidence</Label>
                <p className="text-xs text-muted-foreground">
                  Block uncertain responses or escalate to human agents
                </p>
              </div>
              <Switch
                checked={settings?.require_high_confidence || false}
                onCheckedChange={(checked) => updateSettings({ require_high_confidence: checked })}
              />
            </div>
            {settings?.require_high_confidence && (
              <div className="space-y-2">
                <Label>Confidence Threshold: {Math.round((settings?.confidence_threshold || 0.75) * 100)}%</Label>
                <Slider
                  value={[(settings?.confidence_threshold || 0.75) * 100]}
                  onValueChange={([value]) => updateSettings({ confidence_threshold: value / 100 })}
                  min={50}
                  max={95}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Responses below this confidence level will be blocked or escalated
                </p>
              </div>
            )}
          </div>

          {/* PII Masking */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mask Personally Identifiable Information (PII)</Label>
              <p className="text-xs text-muted-foreground">
                Automatically mask email addresses, phone numbers, and IDs in logs
              </p>
            </div>
            <Switch
              checked={settings?.mask_pii !== false}
              onCheckedChange={(checked) => updateSettings({ mask_pii: checked })}
            />
          </div>

          {/* Anonymize Training Data */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Anonymize Data for Training</Label>
              <p className="text-xs text-muted-foreground">
                Remove customer identifiers from conversations used to improve the model
              </p>
            </div>
            <Switch
              checked={settings?.anonymize_training_data || false}
              onCheckedChange={(checked) => updateSettings({ anonymize_training_data: checked })}
            />
          </div>

          {/* Data Retention */}
          <div className="space-y-2">
            <Label>Data Retention Period</Label>
            <Select
              value={String(settings?.data_retention_days || 90)}
              onValueChange={(value) => updateSettings({ data_retention_days: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days (Recommended)</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              AI response logs will be automatically deleted after this period
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>GDPR Compliance:</strong> Customer data is isolated per conversation. 
              Uploaded documents are private to your business. All PII is encrypted at rest.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
