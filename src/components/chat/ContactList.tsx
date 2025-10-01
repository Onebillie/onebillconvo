import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { Conversation } from "@/types/chat";

interface ContactListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export const ContactList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
}: ContactListProps) => {
  return (
    <div className="p-2">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className={`mb-2 cursor-pointer transition-colors ${
            selectedConversation?.id === conversation.id
              ? "bg-accent"
              : "hover:bg-muted"
          }`}
          onClick={() => onSelectConversation(conversation)}
        >
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={conversation.customer.avatar} />
                <AvatarFallback>
                  {conversation.customer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {conversation.customer.name}
                  </p>
                  <Badge
                    variant={
                      conversation.status === "active" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {conversation.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {conversation.customer.phone}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(conversation.updated_at), "HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
