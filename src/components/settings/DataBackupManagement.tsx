import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, Database, AlertTriangle, FileJson } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface DataBackupManagementProps {
  businessId: string;
}

export function DataBackupManagement({ businessId }: DataBackupManagementProps) {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupFile, setBackupFile] = useState<any>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('business-backup', {
        body: { businessId }
      });

      if (error) throw error;

      // Create downloadable file
      const dataStr = JSON.stringify(data.backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `business-backup-${businessId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Complete',
        description: `Successfully backed up ${data.stats.customers} customers, ${data.stats.conversations} conversations, and ${data.stats.messages} messages.`,
      });
    } catch (error: any) {
      console.error('Backup error:', error);
      toast({
        title: 'Backup Failed',
        description: error.message || 'Failed to create backup',
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string);
          if (!backup.version || !backup.businessId) {
            throw new Error('Invalid backup file format');
          }
          setBackupFile(backup);
          setShowRestoreDialog(true);
        } catch (error) {
          toast({
            title: 'Invalid Backup File',
            description: 'The selected file is not a valid backup',
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRestore = async () => {
    if (!backupFile) return;

    setIsRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('business-restore', {
        body: { 
          backup: backupFile,
          targetBusinessId: businessId,
          mode: restoreMode
        }
      });

      if (error) throw error;

      toast({
        title: 'Restore Complete',
        description: `Successfully restored ${data.restored.customers} customers, ${data.restored.conversations} conversations, and ${data.restored.messages} messages.${data.hasErrors ? ' Some items could not be restored.' : ''}`,
      });

      setShowRestoreDialog(false);
      setBackupFile(null);
    } catch (error: any) {
      console.error('Restore error:', error);
      toast({
        title: 'Restore Failed',
        description: error.message || 'Failed to restore backup',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Backup & Restore
          </CardTitle>
          <CardDescription>
            Create complete backups of your business data and restore when needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Backups include all conversations, messages, customers, templates, AI training data, and settings. 
              Keep backups secure as they contain sensitive business information.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Backup</CardTitle>
                <CardDescription>
                  Export all your business data to a JSON file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isBackingUp ? 'Creating Backup...' : 'Download Backup'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Restore Backup</CardTitle>
                <CardDescription>
                  Import data from a previous backup file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => document.getElementById('backup-file-input')?.click()}
                  disabled={isRestoring}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isRestoring ? 'Restoring...' : 'Upload Backup'}
                </Button>
                <input
                  id="backup-file-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              What's Included in Backups
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground ml-6 list-disc">
              <li>All conversations and messages</li>
              <li>Customer information and profiles</li>
              <li>Call records and transcripts</li>
              <li>Message templates and canned responses</li>
              <li>AI training data and knowledge documents</li>
              <li>Custom statuses and workflows</li>
              <li>Tasks and assignments</li>
              <li>Marketing campaigns and segments</li>
              <li>Business settings and configurations</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              Choose how to restore your data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: Restoring data will affect your current business data based on the mode selected.
              </AlertDescription>
            </Alert>

            <RadioGroup value={restoreMode} onValueChange={(v) => setRestoreMode(v as 'merge' | 'replace')}>
              <div className="flex items-center space-x-2 rounded-lg border p-4">
                <RadioGroupItem value="merge" id="merge" />
                <Label htmlFor="merge" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Merge Mode</div>
                  <div className="text-sm text-muted-foreground">
                    Add backup data to existing data (recommended)
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-4">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Replace Mode</div>
                  <div className="text-sm text-muted-foreground">
                    Delete all existing data and restore from backup
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {backupFile && (
              <div className="text-sm space-y-1">
                <div><strong>Backup Date:</strong> {new Date(backupFile.timestamp).toLocaleString()}</div>
                <div><strong>Customers:</strong> {backupFile.customers?.length || 0}</div>
                <div><strong>Conversations:</strong> {backupFile.conversations?.length || 0}</div>
                <div><strong>Messages:</strong> {backupFile.messages?.length || 0}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreDialog(false);
                setBackupFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={isRestoring}
              variant={restoreMode === 'replace' ? 'destructive' : 'default'}
            >
              {isRestoring ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
