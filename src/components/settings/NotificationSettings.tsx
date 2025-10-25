import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bell, BellOff, Mail, TestTube, RefreshCw } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface NotificationPreferences {
  browser_enabled?: boolean;
  email_enabled?: boolean;
  email_address?: string;
  notify_widget_chat?: boolean;
  notify_whatsapp?: boolean;
  notify_email?: boolean;
  notify_facebook?: boolean;
  notify_instagram?: boolean;
  notify_sms?: boolean;
  notify_tasks?: boolean;
  notify_inmail?: boolean;
  immediate_channels?: string[];
  batch_interval?: string;
  auto_status_on_priority?: boolean;
  priority_status_id?: string | null;
}

interface Status {
  id: string;
  name: string;
}

export const NotificationSettings = () => {
  const { isSupported, permission, subscribeToPush, unsubscribeFromPush } = usePushNotifications();
  const [preferences, setPreferences] = useState<any>({});
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadStatuses();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!business) return;

      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_id', business.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data as NotificationPreferences);
      } else {
        // Create default preferences
        const defaultPrefs: NotificationPreferences = {
          browser_enabled: false,
          email_enabled: true,
          email_address: user.email || '',
          notify_widget_chat: true,
          notify_whatsapp: true,
          notify_email: true,
          notify_facebook: true,
          notify_instagram: true,
          notify_sms: true,
          notify_tasks: true,
          notify_inmail: true,
          immediate_channels: ['widget', 'whatsapp'],
          batch_interval: 'hourly',
          auto_status_on_priority: false,
          priority_status_id: null,
        };
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!business) return;

      const { data, error } = await (supabase as any)
        .from('statuses')
        .select('id, name')
        .eq('business_id', business.id)
        .order('name');

      if (error) throw error;
      setStatuses((data || []).map((s: any) => ({ id: s.id, name: s.name })));
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!business) return;

      const { error } = await (supabase as any)
        .from('notification_preferences')
        .upsert({
          ...preferences,
          user_id: user.id,
          business_id: business.id,
        }, {
          onConflict: 'user_id,business_id'
        });

      if (error) throw error;

      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribeToPush();
      if (success) {
        setPreferences({ ...preferences, browser_enabled: true });
      }
    } else {
      await unsubscribeFromPush();
      setPreferences({ ...preferences, browser_enabled: false });
    }
  };

  const testNotification = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('test-notification');
      if (error) throw error;
      toast.success('Test notification sent! Check your browser and email.');
    } catch (error) {
      console.error('Error testing notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  const resetBrowserPermissions = () => {
    toast.info('To reset browser notifications, go to your browser settings and clear site permissions, then refresh this page.');
  };

  if (loading) {
    return <div>Loading notification settings...</div>;
  }

  const isEnabled = permission === 'granted';

  return (
    <div className="space-y-6">
      {/* Browser/PWA Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Browser Push Notifications
          </CardTitle>
          <CardDescription>
            Get instant browser notifications for new messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported && (
            <p className="text-sm text-muted-foreground">
              Push notifications are not supported in your browser
            </p>
          )}
          
          {isSupported && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enable Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Status: {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not enabled'}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleBrowserToggle}
                  disabled={permission === 'denied'}
                />
              </div>

              {permission === 'denied' && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  Notifications are blocked. Click the button below for instructions to reset.
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testNotification}
                  disabled={!isEnabled || testing}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing ? 'Sending...' : 'Test Notification'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetBrowserPermissions}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Permissions
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Receive batched email summaries of messages and tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-enabled">Enable Email Notifications</Label>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, email_enabled: checked })}
            />
          </div>

          {preferences.email_enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address</Label>
                <Input
                  id="email-address"
                  type="email"
                  value={preferences.email_address}
                  onChange={(e) => setPreferences({ ...preferences, email_address: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-interval">Email Frequency</Label>
                <Select
                  value={preferences.batch_interval}
                  onValueChange={(value) => setPreferences({ ...preferences, batch_interval: value })}
                >
                  <SelectTrigger id="batch-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate (for all channels)</SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="6hours">Every 6 Hours</SelectItem>
                    <SelectItem value="daily">Daily Summary</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Note: Widget and WhatsApp are always sent immediately by default
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Channel Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose which channels trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-widget">Website Widget Chat</Label>
            <Switch
              id="notify-widget"
              checked={preferences.notify_widget_chat}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_widget_chat: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-whatsapp">WhatsApp</Label>
            <Switch
              id="notify-whatsapp"
              checked={preferences.notify_whatsapp}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_whatsapp: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-email">Email</Label>
            <Switch
              id="notify-email"
              checked={preferences.notify_email}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_email: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-facebook">Facebook Messenger</Label>
            <Switch
              id="notify-facebook"
              checked={preferences.notify_facebook}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_facebook: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-instagram">Instagram DM</Label>
            <Switch
              id="notify-instagram"
              checked={preferences.notify_instagram}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_instagram: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-sms">SMS</Label>
            <Switch
              id="notify-sms"
              checked={preferences.notify_sms}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_sms: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-tasks">Admin Tasks</Label>
            <Switch
              id="notify-tasks"
              checked={preferences.notify_tasks}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_tasks: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-inmail">In-Mail Messages</Label>
            <Switch
              id="notify-inmail"
              checked={preferences.notify_inmail}
              onCheckedChange={(checked) => setPreferences({ ...preferences, notify_inmail: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority Auto-Status */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Handling</CardTitle>
          <CardDescription>
            Automatically apply status tags to high-priority notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-status">Auto-apply Status on Priority Messages</Label>
            <Switch
              id="auto-status"
              checked={preferences.auto_status_on_priority}
              onCheckedChange={(checked) => setPreferences({ ...preferences, auto_status_on_priority: checked })}
            />
          </div>

          {preferences.auto_status_on_priority && (
            <div className="space-y-2">
              <Label htmlFor="priority-status">Priority Status Tag</Label>
              <Select
                value={preferences.priority_status_id || undefined}
                onValueChange={(value) => setPreferences({ ...preferences, priority_status_id: value })}
              >
                <SelectTrigger id="priority-status">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Notification Preferences'}
        </Button>
      </div>
    </div>
  );
};