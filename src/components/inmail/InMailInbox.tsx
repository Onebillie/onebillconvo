import { useState } from 'react';
import { useInMail } from '@/hooks/useInMail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, MailOpen, Star, Send, Trash2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { InMailComposer } from './InMailComposer';

export const InMailInbox = () => {
  const { messages, unreadCount, loading, markAsRead, deleteMessage } = useInMail();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'sent' | 'priority'>('all');

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    if (!message.is_read && message.recipient_id) {
      markAsRead(message.id);
    }
  };

  const handleDelete = async (messageId: string, asRecipient: boolean) => {
    await deleteMessage(messageId, asRecipient);
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === 'unread') return !msg.is_read;
    if (filter === 'sent') return msg.sender_id;
    if (filter === 'priority') return msg.priority !== 'normal';
    return true;
  });

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6" />
          <div>
            <h2 className="text-2xl font-bold">In-Mail</h2>
            <p className="text-muted-foreground">Internal team messaging</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Send className="w-4 h-4 mr-2" />
          Compose
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </Button>
        <Button
          variant={filter === 'sent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('sent')}
        >
          Sent
        </Button>
        <Button
          variant={filter === 'priority' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('priority')}
        >
          Priority
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Messages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Mail className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No messages</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted'
                      } ${!message.is_read ? 'font-semibold' : ''}`}
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={message.sender?.avatar_url} />
                          <AvatarFallback>
                            {message.sender?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate">
                              {message.sender?.full_name}
                            </span>
                            {message.priority !== 'normal' && (
                              <Badge
                                variant={getPriorityColor(message.priority)}
                                className="text-xs"
                              >
                                {message.priority}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm truncate">{message.subject}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                        {!message.is_read ? (
                          <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <MailOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedMessage ? selectedMessage.subject : 'Select a message'}
            </CardTitle>
            {selectedMessage && (
              <CardDescription>
                From {selectedMessage.sender?.full_name} •{' '}
                {formatDistanceToNow(new Date(selectedMessage.created_at), {
                  addSuffix: true,
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <Avatar>
                    <AvatarImage src={selectedMessage.sender?.avatar_url} />
                    <AvatarFallback>
                      {selectedMessage.sender?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">
                      {selectedMessage.sender?.full_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedMessage.sender?.email}
                    </div>
                  </div>
                  {selectedMessage.priority !== 'normal' && (
                    <Badge variant={getPriorityColor(selectedMessage.priority)}>
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {selectedMessage.priority}
                    </Badge>
                  )}
                </div>

                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>

                {selectedMessage.related_conversation_id && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Related to conversation #{selectedMessage.related_conversation_id.slice(0, 8)}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setComposerOpen(true);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Reply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleDelete(
                        selectedMessage.id,
                        selectedMessage.recipient_id !== null
                      )
                    }
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-center">
                <Mail className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No message selected</h3>
                <p className="text-muted-foreground">
                  Select a message from the list to view its contents
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InMailComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        replyTo={selectedMessage}
      />
    </div>
  );
};
