import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const useAutoEmailSync = (onSyncComplete?: () => void) => {
  const isSyncingRef = useRef(false);
  const hasInitialSyncRef = useRef(false);

  useEffect(() => {
    const performSync = async () => {
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;

      try {
        // Get all active email accounts
        const { data: accounts, error: accountsError } = await supabase
          .from('email_accounts')
          .select('id, name, inbound_method')
          .eq('is_active', true)
          .eq('sync_enabled', true);

        if (accountsError) throw accountsError;

        if (!accounts || accounts.length === 0) {
          // No accounts to sync, silently skip
          return;
        }

        // Trigger sync for all accounts
        const syncPromises = accounts.map(account => {
          const functionName = account.inbound_method === 'pop3' ? 'email-sync-pop3' : 'email-sync';
          return supabase.functions.invoke(functionName, {
            body: { account_id: account.id }
          });
        });

        const results = await Promise.allSettled(syncPromises);
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed > 0) {
          const errors = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map(r => r.reason?.message || 'Unknown error');
          
          toast({
            title: "Email sync issue",
            description: `${successful} account(s) synced, ${failed} failed`,
            variant: "destructive",
          });
          
          console.error('Email sync errors:', errors);
        } else {
          console.log(`Auto-synced ${successful} email account(s)`);
        }

        onSyncComplete?.();
      } catch (error: any) {
        console.error('Auto email sync error:', error);
        toast({
          title: "Email sync failed",
          description: error.message || "Failed to sync emails",
          variant: "destructive",
        });
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Initial sync on mount (once)
    if (!hasInitialSyncRef.current) {
      hasInitialSyncRef.current = true;
      performSync();
    }

    // Set up periodic sync
    const intervalId = setInterval(performSync, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [onSyncComplete]);
};
