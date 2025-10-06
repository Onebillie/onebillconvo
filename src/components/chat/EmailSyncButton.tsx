import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EmailSyncButtonProps {
  onSyncComplete?: () => void;
}

export const EmailSyncButton = ({ onSyncComplete }: EmailSyncButtonProps) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Get all active email accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('email_accounts')
        .select('id, name')
        .eq('is_active', true)
        .eq('sync_enabled', true);

      if (accountsError) throw accountsError;

      if (!accounts || accounts.length === 0) {
        toast({
          title: "No email accounts",
          description: "Please configure an email account in settings",
          variant: "destructive",
        });
        return;
      }

      // Trigger sync for all accounts
      const syncPromises = accounts.map(account => 
        supabase.functions.invoke('email-sync', {
          body: { account_id: account.id }
        })
      );

      const results = await Promise.allSettled(syncPromises);
      
      // Check results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        toast({
          title: "Sync partially completed",
          description: `${successful} account(s) synced successfully, ${failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync complete",
          description: `Successfully synced ${successful} email account(s)`,
        });
      }

      onSyncComplete?.();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync emails",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync Emails'}
    </Button>
  );
};