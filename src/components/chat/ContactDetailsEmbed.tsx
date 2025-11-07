import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/types/chat";
import DOMPurify from 'dompurify';

type PermissionLevel = 'read_only' | 'agent' | 'admin';

interface ContactDetailsEmbedProps {
  conversation: Conversation;
  embedMode?: boolean;
  permissionLevel?: PermissionLevel;
}

export const ContactDetailsEmbed = ({ 
  conversation, 
  embedMode = false,
  permissionLevel = 'read_only' 
}: ContactDetailsEmbedProps) => {
  const customer = conversation.customer;
  
  if (!customer) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No customer information available
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 h-full overflow-y-auto">
      <div className="flex flex-col items-center space-y-2 pt-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={customer.avatar || undefined} />
          <AvatarFallback className="text-2xl">
            {customer.name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">
            {DOMPurify.sanitize(customer.name || 'Unknown', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}
          </h2>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        {customer.whatsapp_phone && (
          <div>
            <span className="text-muted-foreground">WhatsApp:</span>{" "}
            <span className="font-medium">{customer.whatsapp_phone}</span>
          </div>
        )}
        {customer.whatsapp_name && (
          <div>
            <span className="text-muted-foreground">WhatsApp Name:</span>{" "}
            <span className="font-medium">{customer.whatsapp_name}</span>
          </div>
        )}
        {customer.phone && (
          <div>
            <span className="text-muted-foreground">Phone:</span>{" "}
            <span className="font-medium">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div>
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-medium">{customer.email}</span>
          </div>
        )}
        {customer.address && (
          <div>
            <span className="text-muted-foreground">Address:</span>{" "}
            <span className="font-medium">{customer.address}</span>
          </div>
        )}
      </div>

      {customer.notes && permissionLevel !== 'read_only' && (
        <div className="space-y-2 pt-4 border-t">
          <div className="text-sm font-semibold">Private Notes</div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {customer.notes}
          </div>
        </div>
      )}

      {embedMode && (
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            Viewing with {permissionLevel} permissions
          </div>
        </div>
      )}
    </div>
  );
};
