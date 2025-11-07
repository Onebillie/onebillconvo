import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PersistentHeader } from "@/components/PersistentHeader";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Eye, FileText, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

const OneBillActivity = () => {
  const { currentBusinessId } = useAuth();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchPhone, setSearchPhone] = useState('');

  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ['onebill-submissions', currentBusinessId, filterStatus, filterType, searchPhone],
    queryFn: async () => {
      let query = supabase
        .from('onebill_submissions')
        .select('*')
        .eq('business_id', currentBusinessId!)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('submission_status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('document_type', filterType);
      }

      if (searchPhone) {
        query = query.ilike('phone', `%${searchPhone}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentBusinessId,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; className: string; label: string }> = {
      success: { icon: CheckCircle, className: 'bg-green-500', label: 'Success' },
      failed: { icon: XCircle, className: 'bg-red-500', label: 'Failed' },
      pending: { icon: Clock, className: 'bg-yellow-500', label: 'Pending' },
      retrying: { icon: RefreshCw, className: 'bg-blue-500', label: 'Retrying' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getDocumentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      meter: 'bg-purple-500',
      electricity: 'bg-blue-500',
      gas: 'bg-orange-500',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-500'}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <PersistentHeader />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">OneBill Activity Log</h1>
            </div>
            <p className="text-muted-foreground">
              Track all document submissions to OneBill API
            </p>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="retrying">Retrying</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Document Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Phone Number</label>
                <Input
                  placeholder="Search by phone..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Next Retry</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading submissions...
                    </TableCell>
                  </TableRow>
                ) : submissions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions?.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="text-sm">
                        {format(new Date(submission.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {submission.file_name}
                      </TableCell>
                      <TableCell>
                        {getDocumentTypeBadge(submission.document_type)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {submission.phone}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(submission.submission_status)}
                      </TableCell>
                      <TableCell>
                        {submission.http_status && (
                          <Badge variant={submission.http_status < 400 ? 'default' : 'destructive'}>
                            {submission.http_status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.retry_count > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{submission.retry_count}/{submission.max_retries || 3}</span>
                            <Progress 
                              value={(submission.retry_count / (submission.max_retries || 3)) * 100} 
                              className="h-1.5 w-12"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {submission.next_retry_at ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{format(new Date(submission.next_retry_at), 'HH:mm')}</span>
                          </div>
                        ) : submission.submission_status === 'failed' && submission.retry_count >= (submission.max_retries || 3) ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <AlertCircle className="w-3 h-3" />
                            <span>Max reached</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        User
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Document Type</label>
                  <p className="mt-1">{getDocumentTypeBadge(selectedSubmission.document_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="mt-1">{getStatusBadge(selectedSubmission.submission_status)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">File Name</label>
                  <p className="text-sm mt-1">{selectedSubmission.file_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm font-mono mt-1">{selectedSubmission.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Confidence</label>
                  <p className="text-sm mt-1">{(selectedSubmission.classification_confidence * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">HTTP Status</label>
                  <p className="text-sm mt-1">{selectedSubmission.http_status || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Retry Count</label>
                  <p className="text-sm mt-1">{selectedSubmission.retry_count || 0} / {selectedSubmission.max_retries || 3}</p>
                </div>
                {selectedSubmission.next_retry_at && (
                  <div>
                    <label className="text-sm font-medium">Next Retry</label>
                    <p className="text-sm mt-1">{format(new Date(selectedSubmission.next_retry_at), 'PPp')}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Extracted Fields</label>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedSubmission.extracted_fields, null, 2)}
                </pre>
              </div>

              {selectedSubmission.onebill_response && (
                <div>
                  <label className="text-sm font-medium">OneBill Response</label>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedSubmission.onebill_response, null, 2)}
                  </pre>
                </div>
              )}

              {selectedSubmission.error_message && (
                <div>
                  <label className="text-sm font-medium text-red-500">Error Message</label>
                  <p className="mt-2 p-3 bg-red-50 dark:bg-red-950 rounded text-sm text-red-600 dark:text-red-400">
                    {selectedSubmission.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OneBillActivity;
