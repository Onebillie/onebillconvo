import { useState, useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Phone } from 'lucide-react';
import { CallSystemSettings } from './CallSystemSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const CallSettingsAccordion = () => {
  const { user } = useAuth();
  const [isOneBillChat, setIsOneBillChat] = useState(false);

  useEffect(() => {
    const checkOneBillChat = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('is_onebillchat_user');
      setIsOneBillChat(data || false);
    };
    checkOneBillChat();
  }, [user]);

  if (!isOneBillChat) {
    return null;
  }

  return (
    <AccordionItem value="calls">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span>Call System (Beta)</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <CallSystemSettings />
      </AccordionContent>
    </AccordionItem>
  );
};
