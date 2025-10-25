import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AVAILABLE_EVENTS = [
  'message.received',
  'message.sent',
  'conversation.created',
  'conversation.assigned',
  'conversation.status_changed',
  'customer.created',
  'customer.updated',
];

export function WebhookManagement() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);
  const [showSecret, setShowSecret] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    retry_count: 3,
    timeout_seconds: 30,
  });

  useEffect(() => {
    loadWebhooks();
    loadDeliveries();
  }, []);

  const loadWebhooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessUsers } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!businessUsers) return;

      const { data, error } = await supabase
        .from('webhook_configs' as any)
        .select('*')
        .eq('business_id', businessUsers.business_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error: any) {
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessUsers } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!businessUsers) return;

      const { data: webhookConfigs } = await supabase
        .from('webhook_configs' as any)
        .select('id')
        .eq('business_id', businessUsers.business_id);

      if (!webhookConfigs) return;

      const webhookIds = webhookConfigs.map((w: any) => w.id);

      const { data, error } = await supabase
        .from('webhook_deliveries' as any)
        .select('*, webhook_configs(name, url)')
        .in('webhook_config_id', webhookIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error: any) {
      console.error('Error loading deliveries:', error);
    }
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: businessUsers } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!businessUsers) throw new Error('Business not found');

      const webhookData = {
        ...formData,
        business_id: businessUsers.business_id,
        secret: formData.secret || generateSecret(),
      };

      if (editingWebhook) {
        const { error } = await supabase
          .from('webhook_configs' as any)
          .update(webhookData)
          .eq('id', editingWebhook.id);

        if (error) throw error;
        toast({ title: 'Webhook updated successfully' });
      } else {
        const { error } = await supabase
          .from('webhook_configs' as any)
          .insert(webhookData);

        if (error) throw error;
        toast({ title: 'Webhook created successfully' });
      }

      setIsOpen(false);
      setEditingWebhook(null);
      setFormData({
        name: '',
        url: '',
        events: [],
        secret: '',
        retry_count: 3,
        timeout_seconds: 30,
      });
      loadWebhooks();
    } catch (error: any) {
      toast({
        title: 'Error saving webhook',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const { error } = await supabase
        .from('webhook_configs' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Webhook deleted successfully' });
      loadWebhooks();
    } catch (error: any) {
      toast({
        title: 'Error deleting webhook',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (webhook: any) => {
    try {
      const { error } = await supabase
        .from('webhook_configs' as any)
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);

      if (error) throw error;
      toast({ title: `Webhook ${!webhook.is_active ? 'activated' : 'deactivated'}` });
      loadWebhooks();
    } catch (error: any) {
      toast({
        title: 'Error updating webhook',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Webhook Management</h3>
          <p className="text-sm text-muted-foreground">
            Configure webhooks to receive real-time events from your conversations
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingWebhook(null);
              setFormData({
                name: '',
                url: '',
                events: [],
                secret: '',
                retry_count: 3,
                timeout_seconds: 30,
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? 'Edit' : 'Create'} Webhook</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My CRM Webhook"
                  required
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://your-crm.com/webhooks/alacarte"
                  type="url"
                  required
                />
              </div>
              <div>
                <Label>Events to Subscribe</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        id={event}
                        checked={formData.events.includes(event)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, events: [...formData.events, event] });
                          } else {
                            setFormData({
                              ...formData,
                              events: formData.events.filter((e) => e !== event),
                            });
                          }
                        }}
                      />
                      <label htmlFor={event} className="text-sm cursor-pointer">
                        {event}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Secret (for signature verification)</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    placeholder="Leave empty to auto-generate"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, secret: generateSecret() })}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Retry Count</Label>
                  <Input
                    type="number"
                    value={formData.retry_count}
                    onChange={(e) => setFormData({ ...formData, retry_count: parseInt(e.target.value) })}
                    min={0}
                    max={5}
                  />
                </div>
                <div>
                  <Label>Timeout (seconds)</Label>
                  <Input
                    type="number"
                    value={formData.timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
                    min={5}
                    max={60}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingWebhook ? 'Update' : 'Create'} Webhook
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{webhook.name}</h4>
                  <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                    {webhook.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">URL:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{webhook.url}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(webhook.url)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Secret:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {showSecret[webhook.id] ? webhook.secret : '••••••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSecret({ ...showSecret, [webhook.id]: !showSecret[webhook.id] })}
                    >
                      {showSecret[webhook.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(webhook.secret)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div>
                    <span className="font-medium">Events:</span>{' '}
                    {webhook.events.map((event: string) => (
                      <Badge key={event} variant="outline" className="ml-1">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(webhook)}
                >
                  {webhook.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingWebhook(webhook);
                    setFormData(webhook);
                    setIsOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(webhook.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Deliveries */}
      <div className="mt-8">
        <h4 className="text-lg font-semibold mb-4">Recent Deliveries</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Webhook</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell>{(delivery as any).webhook_configs?.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{delivery.event_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      delivery.status === 'delivered'
                        ? 'default'
                        : delivery.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {delivery.status}
                  </Badge>
                </TableCell>
                <TableCell>{delivery.attempt_count}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(delivery.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}