import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Download, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface SecurityLog {
  id: string;
  user_id: string | null;
  business_id: string | null;
  event_category: string;
  event_type: string;
  event_action: string;
  severity: string;
  ip_address: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export default function SecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (categoryFilter !== 'all') {
        query = query.eq('event_category', categoryFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Category', 'Type', 'Action', 'Severity', 'IP Address', 'Success', 'Error'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.event_category,
        log.event_type,
        log.event_action,
        log.severity,
        log.ip_address || '',
        log.success ? 'Yes' : 'No',
        log.error_message || '',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-logs-${new Date().toISOString()}.csv`;
    a.click();
    toast.success('Logs exported successfully');
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = search.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(searchLower) ||
      log.event_category.toLowerCase().includes(searchLower) ||
      log.ip_address?.toLowerCase().includes(searchLower) ||
      log.error_message?.toLowerCase().includes(searchLower)
    );
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Logs
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor all security events across the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search security logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="sso">SSO</SelectItem>
                <SelectItem value="embed">Embed</SelectItem>
                <SelectItem value="data">Data</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={fetchLogs} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportLogs} variant="outline">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Events ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <TableHead>Severity</TableHead>
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
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.event_type}</div>
                          <div className="text-xs text-muted-foreground">{log.event_action}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(log.severity) as any}>
                          {log.severity}
                        </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
