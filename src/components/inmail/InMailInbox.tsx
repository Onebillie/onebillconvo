import { useState } from 'react';
import { useInMail } from '@/hooks/useInMail';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MailOpen, Star, Send, Trash2, AlertCircle, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const InMailInbox = () => {
  const { messages, unreadCount, loading, markAsRead, deleteMessage, sendMessage } = useInMail();
  const { user, currentBusinessId } = useAuth();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'sent' | 'priority'>('all');
  const [composerData, setComposerData] = useState({
    recipientId: '',
    subject: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high'
  });
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const fetchStaffMembers = async () => {
    if (!currentBusinessId) return;
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('business_users')
        .select(`
          user_id,
          profiles!inner(id, full_name, email, avatar_url)
        `)
        .eq('business_id', currentBusinessId)
        .neq('user_id', user?.id || '');

      if (error) throw error;
      setStaffMembers(data?.map((bu: any) => bu.profiles) || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive"
      });
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleOpenComposer = () => {
    fetchStaffMembers();
    setComposerOpen(true);
  };

  const handleSendMessage = async () => {
    if (!composerData.recipientId || !composerData.subject || !composerData.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await sendMessage(
        composerData.recipientId,
        composerData.subject,
        composerData.content,
        composerData.priority
      );
      
      setComposerOpen(false);
      setComposerData({
        recipientId: '',
        subject: '',
        content: '',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

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
        <Button onClick={handleOpenComposer}>
          <Plus className="w-4 h-4 mr-2" />
          New Message
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

      {/* Message Composer Dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send an internal message to a team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Select
                value={composerData.recipientId}
                onValueChange={(value) => setComposerData(prev => ({ ...prev, recipientId: value }))}
                disabled={loadingStaff}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={staff.avatar_url} />
                          <AvatarFallback>{staff.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <span>{staff.full_name || staff.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={composerData.priority}
                onValueChange={(value: 'low' | 'normal' | 'high') => 
                  setComposerData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Message subject..."
                value={composerData.subject}
                onChange={(e) => setComposerData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message..."
                className="min-h-[150px]"
                value={composerData.content}
                onChange={(e) => setComposerData(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
