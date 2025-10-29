import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const DepartmentManagement = () => {
  const { currentBusinessId } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
  });

  useEffect(() => {
    if (currentBusinessId) {
      fetchDepartments();
      fetchStaff();
    }
  }, [currentBusinessId]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        manager:profiles!departments_manager_id_fkey(id, full_name),
        member_count:profiles(count)
      `)
      .eq('business_id', currentBusinessId)
      .order('name');

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', await getUserIds());

    if (!error && data) {
      setStaff(data);
    }
  };

  const getUserIds = async () => {
    const { data } = await supabase
      .from('business_users')
      .select('user_id')
      .eq('business_id', currentBusinessId);
    return data?.map(u => u.user_id) || [];
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Department name is required',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      business_id: currentBusinessId,
      name: formData.name,
      description: formData.description,
      manager_id: formData.manager_id || null,
    };

    if (editingDept) {
      const { error } = await supabase
        .from('departments')
        .update(payload)
        .eq('id', editingDept.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update department',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Department updated successfully',
      });
    } else {
      const { error } = await supabase
        .from('departments')
        .insert(payload);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create department',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Department created successfully',
      });
    }

    setShowDialog(false);
    setEditingDept(null);
    setFormData({ name: '', description: '', manager_id: '' });
    fetchDepartments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete department',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Department deleted successfully',
    });
    fetchDepartments();
  };

  const openEditDialog = (dept: any) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      manager_id: dept.manager_id || '',
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Departments</h3>
          <p className="text-sm text-muted-foreground">
            Organize your team into departments for better workflow management
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {departments.map((dept) => (
          <Card key={dept.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="font-semibold">{dept.name}</h4>
                {dept.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {dept.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(dept)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(dept.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{dept.member_count || 0} members</span>
              </div>
              {dept.manager && (
                <div>Manager: {dept.manager.full_name}</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Department Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Sales, Support, Technical"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What does this department do?"
              />
            </div>

            <div>
              <Label>Department Manager</Label>
              <Select
                value={formData.manager_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, manager_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
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
              {editingDept ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
