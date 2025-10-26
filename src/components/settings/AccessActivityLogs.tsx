import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  event_category: string;
  event_type: string;
  event_action: string;
  severity: string;
  ip_address: string | null;
  success: boolean;
  created_at: string;
}

export const AccessActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('id, event_category, event_type, event_action, severity, ip_address, success, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (categoryFilter !== 'all') {
        query = query.eq('event_category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Category', 'Type', 'Action', 'IP Address', 'Status'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.event_category,
        log.event_type,
        log.event_action,
        log.ip_address || '',
        log.success ? 'Success' : 'Failed',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString()}.csv`;
    a.click();
    toast.success('Logs exported successfully');
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = search.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(searchLower) ||
      log.event_category.toLowerCase().includes(searchLower) ||
      log.ip_address?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Access & Activity Logs
            </CardTitle>
            <CardDescription>
              Monitor all access and activity in your business account
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLogs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setCategoryFilter('all')}>
              All Activity
            </TabsTrigger>
            <TabsTrigger value="auth" onClick={() => setCategoryFilter('auth')}>
              Authentication
            </TabsTrigger>
            <TabsTrigger value="api" onClick={() => setCategoryFilter('api')}>
              API Access
            </TabsTrigger>
            <TabsTrigger value="sso" onClick={() => setCategoryFilter('sso')}>
              SSO
            </TabsTrigger>
            <TabsTrigger value="data" onClick={() => setCategoryFilter('data')}>
              Data Changes
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-4">
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value={categoryFilter} className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.event_category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.event_type}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.event_action}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge variant="secondary">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
