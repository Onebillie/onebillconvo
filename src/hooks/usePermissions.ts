import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePermissions = () => {
  const { user, isSuperAdmin } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPermissions();
    }
  }, [user]);

  const fetchPermissions = async () => {
    if (!user) return;

    // Superadmins have all permissions
    if (isSuperAdmin) {
      const { data: allPerms } = await supabase
        .from('permissions')
        .select('name');
      setPermissions(allPerms?.map(p => p.name) || []);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('role_permissions')
      .select('permission_id, permissions(name)')
      .eq('user_id', user.id);

    const permNames = data?.map((rp: any) => rp.permissions?.name).filter(Boolean) || [];
    setPermissions(permNames);
    setLoading(false);
  };

  const hasPermission = (permissionName: string): boolean => {
    return isSuperAdmin || permissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return isSuperAdmin || permissionNames.some(p => permissions.includes(p));
  };

  return { permissions, hasPermission, hasAnyPermission, loading, refetch: fetchPermissions };
};
