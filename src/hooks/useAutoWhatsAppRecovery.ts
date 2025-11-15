import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Conversation } from '@/types/chat';

const COOLDOWN_HOURS = 24;

export const useAutoWhatsAppRecovery = (
  conversation: Conversation | null,
  onRecoveryComplete?: () => void
) => {
  const isRecoveringRef = useRef(false);

  useEffect(() => {
    if (!conversation || isRecoveringRef.current) return;

    // Only auto-recover for WhatsApp conversations
    const platform = conversation.last_message?.platform || '';
    if (platform !== 'whatsapp') return;

    const conversationId = conversation.id;
    const storageKey = `whatsapp-recovery-${conversationId}`;
    
    // Check last recovery timestamp
    const lastRecovery = localStorage.getItem(storageKey);
    const now = Date.now();
    
    if (lastRecovery) {
      const hoursSinceLastRecovery = (now - parseInt(lastRecovery)) / (1000 * 60 * 60);
      if (hoursSinceLastRecovery < COOLDOWN_HOURS) {
        // Still within cooldown period
        return;
      }
    }

    // Perform recovery
    isRecoveringRef.current = true;

    const recoverHistory = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-recover-from-meta', {
          body: {
            conversation_id: conversationId,
            days_back: 7
          }
        });

        if (error) {
          console.error('Auto WhatsApp recovery failed:', error);
          toast({
            title: "WhatsApp recovery failed",
            description: error.message || "Could not recover message history",
            variant: "destructive"
          });
          return;
        }

        if (data?.success) {
          // Store recovery timestamp
          localStorage.setItem(storageKey, now.toString());
          
          // Silently refresh messages
          onRecoveryComplete?.();
          
          console.log(`Auto-recovered ${data.results.messages_recovered} WhatsApp messages`);
        }
      } catch (error: any) {
        console.error('Auto WhatsApp recovery error:', error);
        toast({
          title: "WhatsApp recovery failed",
          description: error.message || "Could not recover message history",
          variant: "destructive"
        });
      } finally {
        isRecoveringRef.current = false;
      }
    };

    recoverHistory();
  }, [conversation, onRecoveryComplete]);
};
