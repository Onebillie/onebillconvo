import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, Settings, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const TwilioVoiceManagement = () => {
  const { currentBusinessId, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isOneBillChat, setIsOneBillChat] = useState(false);
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
    if (user) {
      checkAccess();
    }
    if (currentBusinessId && isOneBillChat) {
      loadSettings();
    }
  }, [currentBusinessId, user, isOneBillChat]);

  const checkAccess = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('is_onebillchat_user');
    setIsOneBillChat(data || false);
  };

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

      toast.success('Twilio Voice settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (!isOneBillChat) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Voice calling is currently in beta and only available for OneBillChat business users.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Phone className="h-4 w-4" />
        <AlertDescription>
          Configure your Twilio credentials to enable voice calling. You'll need your Account SID, Auth Token, API Key, API Secret, and TwiML App SID from your Twilio Console.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="recording">Recording & Compliance</TabsTrigger>
          <TabsTrigger value="routing">Call Routing</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Credentials</CardTitle>
              <CardDescription>
                These credentials are stored securely as Supabase secrets. Add them via the Supabase Dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Required Secrets</Label>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• TWILIO_ACCOUNT_SID</li>
                  <li>• TWILIO_AUTH_TOKEN</li>
                  <li>• TWILIO_API_KEY</li>
                  <li>• TWILIO_API_SECRET</li>
                  <li>• TWILIO_TWIML_APP_SID</li>
                </ul>
              </div>
              <Button variant="outline" asChild>
                <a 
                  href="https://supabase.com/dashboard/project/jrtlrnfdqfkjlkpfirzr/settings/functions" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Secrets in Supabase
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="space-y-4 pt-4">
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

              <div className="space-y-2">
                <Label htmlFor="retention">Data Retention (days)</Label>
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
        </TabsContent>

        <TabsContent value="routing" className="space-y-4 pt-4">
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
              <CardDescription>Send call events to your CRM via webhook</CardDescription>
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
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Voice Settings'}
      </Button>
    </div>
  );
};
