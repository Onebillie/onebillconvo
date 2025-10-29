import { useEffect, useState } from 'react';
import { User, MessageSquare, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface CustomerShareCardProps {
  customerId: string;
}

export const CustomerShareCard = ({ customerId }: CustomerShareCardProps) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const fetchCustomer = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        avatar,
        conversations (
          id,
          status,
          updated_at
        )
      `)
      .eq('id', customerId)
      .single();

    if (!error && data) {
      setCustomer(data);
    }
    setLoading(false);
  };

  const handleViewCustomer = () => {
    navigate(`/app/dashboard?customer=${customerId}`);
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-16 bg-muted rounded" />
      </Card>
    );
  }

  if (!customer) {
    return null;
  }

  const activeConversation = customer.conversations?.[0];

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={customer.avatar} alt={customer.name} />
          <AvatarFallback>
            <User className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{customer.name}</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            {customer.phone && <div>📱 {customer.phone}</div>}
            {customer.email && <div>📧 {customer.email}</div>}
            {activeConversation && (
              <div className="text-xs">
                Status: <span className="font-medium">{activeConversation.status}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewCustomer}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </div>
    </Card>
  );
};
