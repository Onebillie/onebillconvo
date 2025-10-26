import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface IPWhitelistEntry {
  id: string;
  ip_address: string;
  ip_range: string | null;
  description: string | null;
  enabled: boolean;
  created_at: string;
}

export const IPWhitelistManagement = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<IPWhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentIP, setCurrentIP] = useState('');
  const [newEntry, setNewEntry] = useState({
    ipAddress: '',
    ipRange: '',
    description: '',
  });

  useEffect(() => {
    fetchEntries();
    detectCurrentIP();
  }, []);

  const detectCurrentIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setCurrentIP(data.ip);
    } catch (error) {
      console.error('Error detecting IP:', error);
    }
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_ip_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching IP whitelist:', error);
      toast.error('Failed to load IP whitelist');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newEntry.ipAddress && !newEntry.ipRange) {
      toast.error('Please enter an IP address or IP range');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_ip_whitelist')
        .insert({
          user_id: user?.id,
          ip_address: newEntry.ipAddress || '0.0.0.0',
          ip_range: newEntry.ipRange || null,
          description: newEntry.description || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success('IP address added to whitelist');
      setDialogOpen(false);
      setNewEntry({ ipAddress: '', ipRange: '', description: '' });
      fetchEntries();
    } catch (error: any) {
      console.error('Error adding IP:', error);
      toast.error('Failed to add IP address');
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_ip_whitelist')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      toast.success(enabled ? 'IP enabled' : 'IP disabled');
      fetchEntries();
    } catch (error: any) {
      console.error('Error toggling IP:', error);
      toast.error('Failed to update IP');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this IP address from the whitelist?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_ip_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('IP address removed from whitelist');
      fetchEntries();
    } catch (error: any) {
      console.error('Error deleting IP:', error);
      toast.error('Failed to delete IP address');
    }
  };

  const useCurrentIP = () => {
    setNewEntry({ ...newEntry, ipAddress: currentIP });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              IP Whitelist Management
            </CardTitle>
            <CardDescription>
              Restrict admin access to specific IP addresses
              {currentIP && (
                <span className="block mt-1">Your current IP: <code className="bg-muted px-2 py-1 rounded">{currentIP}</code></span>
              )}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add IP to Whitelist</DialogTitle>
                <DialogDescription>
                  Add a single IP address or an IP range (CIDR notation)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ip-address">Single IP Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ip-address"
                      placeholder="192.168.1.1"
                      value={newEntry.ipAddress}
                      onChange={(e) => setNewEntry({ ...newEntry, ipAddress: e.target.value })}
                    />
                    {currentIP && (
                      <Button variant="outline" onClick={useCurrentIP}>
                        Use Current
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="ip-range">IP Range (CIDR)</Label>
                  <Input
                    id="ip-range"
                    placeholder="192.168.1.0/24"
                    value={newEntry.ipRange}
                    onChange={(e) => setNewEntry({ ...newEntry, ipRange: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Office network"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add to Whitelist</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No IP addresses in whitelist</p>
            <p className="text-sm mt-2">When empty, all IPs are allowed</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address / Range</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">
                    {entry.ip_range || entry.ip_address}
                  </TableCell>
                  <TableCell>{entry.description || '-'}</TableCell>
                  <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Switch
                      checked={entry.enabled}
                      onCheckedChange={(checked) => handleToggle(entry.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
