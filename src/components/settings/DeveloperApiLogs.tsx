import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, Download, RefreshCw, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string | null;
  error_message: string | null;
  request_headers: any;
  request_body: any;
  response_body: any;
  created_at: string;
}

export const DeveloperApiLogs = () => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('comprehensive_api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter === 'error') {
        query = query.gte('status_code', 400);
      } else if (statusFilter === 'success') {
        query = query.lt('status_code', 400);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching API logs:', error);
      toast.error('Failed to load API logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Method', 'Endpoint', 'Status', 'Response Time (ms)', 'IP Address'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.method,
        log.endpoint,
        log.status_code.toString(),
        log.response_time_ms?.toString() || '',
        log.ip_address || '',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-logs-${new Date().toISOString()}.csv`;
    a.click();
    toast.success('Logs exported successfully');
  };

  const viewDetails = (log: ApiLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = search.toLowerCase();
    return (
      log.endpoint.toLowerCase().includes(searchLower) ||
      log.method.toLowerCase().includes(searchLower) ||
      log.ip_address?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: number) => {
    if (status < 300) return 'secondary';
    if (status < 400) return 'default';
    if (status < 500) return 'destructive';
    return 'destructive';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Request Logs
              </CardTitle>
              <CardDescription>
                Monitor API requests, responses, and performance
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Search endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="success">Success (2xx-3xx)</SelectItem>
                <SelectItem value="error">Errors (4xx-5xx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(log.status_code) as any}>
                          {log.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Request Details</DialogTitle>
            <DialogDescription>
              {selectedLog && `${selectedLog.method} ${selectedLog.endpoint}`}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Headers</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.request_headers, null, 2)}
                </pre>
              </div>
              {selectedLog.request_body && (
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.response_body && (
                <div>
                  <h4 className="font-semibold mb-2">Response Body</h4>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.error_message && (
                <div>
                  <h4 className="font-semibold mb-2 text-destructive">Error</h4>
                  <pre className="bg-destructive/10 p-4 rounded-lg text-xs overflow-x-auto">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
