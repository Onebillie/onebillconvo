import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const CallSystemSettings = () => {
  const { currentBusinessId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({
    recording_enabled: true,
    require_consent: true,
    transcription_enabled: true,
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    voicemail_greeting: 'Thank you for calling. Please leave a message.',
    crm_webhook_url: '',
    crm_webhook_token: '',
    retention_days: 90
  });

  useEffect(() => {
    if (currentBusinessId) {
      loadSettings();
    }
  }, [currentBusinessId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('call_settings')
        .select('*')
        .eq('business_id', currentBusinessId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading call settings:', error);
    }
  };

  const handleSave = async () => {
    if (!currentBusinessId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('call_settings')
        .upsert({
          business_id: currentBusinessId,
          ...settings
        });

      if (error) throw error;

      toast.success('Call settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call Recording</CardTitle>
          <CardDescription>Configure call recording and compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="recording">Enable Recording</Label>
            <Switch
              id="recording"
              checked={settings.recording_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, recording_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="consent">Require Consent Message</Label>
            <Switch
              id="consent"
              checked={settings.require_consent}
              onCheckedChange={(checked) => setSettings({ ...settings, require_consent: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="transcription">Enable Transcription</Label>
            <Switch
              id="transcription"
              checked={settings.transcription_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, transcription_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>Set operating hours for call routing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={settings.business_hours_start}
                onChange={(e) => setSettings({ ...settings, business_hours_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="time"
                value={settings.business_hours_end}
                onChange={(e) => setSettings({ ...settings, business_hours_end: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="greeting">Voicemail Greeting</Label>
            <Input
              id="greeting"
              value={settings.voicemail_greeting}
              onChange={(e) => setSettings({ ...settings, voicemail_greeting: e.target.value })}
              placeholder="Thank you for calling..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CRM Integration</CardTitle>
          <CardDescription>Send call events to your CRM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook URL</Label>
            <Input
              id="webhook"
              value={settings.crm_webhook_url}
              onChange={(e) => setSettings({ ...settings, crm_webhook_url: e.target.value })}
              placeholder="https://your-crm.com/webhook"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Authorization Token</Label>
            <Input
              id="token"
              type="password"
              value={settings.crm_webhook_token}
              onChange={(e) => setSettings({ ...settings, crm_webhook_token: e.target.value })}
              placeholder="Bearer token for authentication"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>Configure how long call data is kept</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="retention">Retention Period (days)</Label>
            <Input
              id="retention"
              type="number"
              value={settings.retention_days}
              onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value) })}
              min={30}
              max={365}
            />
            <p className="text-xs text-muted-foreground">
              Recordings and transcripts will be automatically deleted after this period
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
};
