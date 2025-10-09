import { Conversation } from "@/types/chat";
import { ConversationListItem } from "./ConversationListItem";

interface ContactListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  contextMenu?: (conversation: Conversation) => React.ReactNode;
}

export const ContactList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  contextMenu,
}: ContactListProps) => {
  return (
    <div className="space-y-0">
      {conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedConversation?.id === conversation.id}
          onSelect={onSelectConversation}
          contextMenu={contextMenu}
        />
      ))}
    </div>
  );
};
