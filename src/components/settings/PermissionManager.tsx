import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Lock } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  permissions: string[];
}

export const PermissionManager = () => {
  const { currentBusinessId } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBusinessId) {
      fetchData();
    }
  }, [currentBusinessId]);

  const fetchData = async () => {
    if (!currentBusinessId) return;

    // Fetch all permissions
    const { data: permsData } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    setPermissions(permsData || []);

    // Fetch staff with their permissions
    const { data: staffData } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role_permissions!inner(permission_id)
      `)
      .eq('role_permissions.business_id', currentBusinessId);

    const staffWithPerms = staffData?.map(member => ({
      id: member.id,
      full_name: member.full_name,
      email: member.email,
      permissions: member.role_permissions?.map((rp: any) => rp.permission_id) || [],
    })) || [];

    setStaff(staffWithPerms);
    setLoading(false);
  };

  const togglePermission = async (userId: string, permissionId: string, currentlyHas: boolean) => {
    if (!currentBusinessId) return;

    if (currentlyHas) {
      // Remove permission
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('business_id', currentBusinessId)
        .eq('user_id', userId)
        .eq('permission_id', permissionId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to remove permission',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Grant permission
      const { error } = await supabase
        .from('role_permissions')
        .insert([{
          business_id: currentBusinessId,
          user_id: userId,
          permission_id: permissionId,
        }]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to grant permission',
          variant: 'destructive',
        });
        return;
      }
    }

    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6" />
        <div>
          <h2 className="text-2xl font-bold">Permission Management</h2>
          <p className="text-muted-foreground">
            Control what each team member can access and manage
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Access Control Matrix
          </CardTitle>
          <CardDescription>
            Toggle permissions for each staff member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold min-w-[200px]">
                    Permission
                  </th>
                  {staff.map((member) => (
                    <th key={member.id} className="text-center p-3 min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium text-sm">{member.full_name}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <>
                    <tr key={category} className="bg-muted/50">
                      <td colSpan={staff.length + 1} className="p-3">
                        <Badge variant="secondary" className="capitalize">
                          {category}
                        </Badge>
                      </td>
                    </tr>
                    {perms.map((perm) => (
                      <tr key={perm.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{perm.name.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              {perm.description}
                            </div>
                          </div>
                        </td>
                        {staff.map((member) => {
                          const hasPermission = member.permissions.includes(perm.id);
                          return (
                            <td key={member.id} className="p-3 text-center">
                              <div className="flex justify-center">
                                <Switch
                                  checked={hasPermission}
                                  onCheckedChange={() =>
                                    togglePermission(member.id, perm.id, hasPermission)
                                  }
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
