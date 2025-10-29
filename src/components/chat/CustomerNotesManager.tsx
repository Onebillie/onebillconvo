import { useState, useEffect } from 'react';
import { Plus, Pin, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface CustomerNotesManagerProps {
  customerId: string;
  conversationId?: string;
}

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'upsell', label: 'Upsell' },
];

const VISIBILITY_OPTIONS = [
  { value: 'team', label: 'Team' },
  { value: 'managers_only', label: 'Managers Only' },
  { value: 'private', label: 'Private' },
];

export const CustomerNotesManager = ({ customerId, conversationId }: CustomerNotesManagerProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    content: '',
    note_type: 'general',
    visibility: 'team',
    tags: '',
  });

  useEffect(() => {
    fetchNotes();
  }, [customerId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('conversation_notes')
      .select(`
        *,
        user:profiles!conversation_notes_user_id_fkey(full_name)
      `)
      .eq('customer_id', customerId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
  };

  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Note content is required',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      customer_id: customerId,
      conversation_id: conversationId || null,
      user_id: user?.id,
      content: formData.content,
      note_type: formData.note_type,
      visibility: formData.visibility,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
    };

    if (editingNote) {
      const { error } = await supabase
        .from('conversation_notes')
        .update(payload)
        .eq('id', editingNote.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update note',
          variant: 'destructive',
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('conversation_notes')
        .insert(payload);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create note',
          variant: 'destructive',
        });
        return;
      }
    }

    toast({
      title: 'Success',
      description: editingNote ? 'Note updated' : 'Note created',
    });

    setShowDialog(false);
    setEditingNote(null);
    setFormData({ content: '', note_type: 'general', visibility: 'team', tags: '' });
    fetchNotes();
  };

  const togglePin = async (note: any) => {
    const { error } = await supabase
      .from('conversation_notes')
      .update({ is_pinned: !note.is_pinned })
      .eq('id', note.id);

    if (!error) {
      fetchNotes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;

    const { error } = await supabase
      .from('conversation_notes')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: 'Note deleted' });
      fetchNotes();
    }
  };

  const openEditDialog = (note: any) => {
    setEditingNote(note);
    setFormData({
      content: note.content,
      note_type: note.note_type,
      visibility: note.visibility,
      tags: note.tags?.join(', ') || '',
    });
    setShowDialog(true);
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || note.note_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {NOTE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      <div className="space-y-2">
        {filteredNotes.map((note) => (
          <Card key={note.id} className={`p-4 ${note.is_pinned ? 'border-primary' : ''}`}>
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="flex gap-2 items-center">
                <Badge variant="outline">{note.note_type}</Badge>
                {note.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                {note.tags && note.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => togglePin(note)}>
                  <Pin className={`h-4 w-4 ${note.is_pinned ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(note)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(note.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm whitespace-pre-wrap mb-2">{note.content}</p>

            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{note.user?.full_name}</span>
              <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Note Type</Label>
              <Select
                value={formData.note_type}
                onValueChange={(value) => setFormData({ ...formData, note_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter note content..."
                rows={6}
              />
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., urgent, vip, follow-up"
              />
            </div>

            <div>
              <Label>Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingNote ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
