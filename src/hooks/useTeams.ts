import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Team {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  department: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export const useTeams = () => {
  const { currentBusinessId } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBusinessId) {
      fetchTeams();
    }
  }, [currentBusinessId]);

  const fetchTeams = async () => {
    if (!currentBusinessId) return;

    const { data, error } = await supabase
      .from('teams' as any)
      .select('*')
      .eq('business_id', currentBusinessId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch teams',
        variant: 'destructive',
      });
      return;
    }

    // Get member counts separately
    const teamsWithCount = await Promise.all(
      (data || []).map(async (team: any) => {
        const { count } = await supabase
          .from('team_members' as any)
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);
        
        return {
          ...team,
          member_count: count || 0
        } as Team;
      })
    );

    setTeams(teamsWithCount);
    setLoading(false);
  };

  const fetchTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
    const { data: teamMembersData, error } = await supabase
      .from('team_members' as any)
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch team members',
        variant: 'destructive',
      });
      return [];
    }

    if (!teamMembersData || teamMembersData.length === 0) return [];

    // Fetch profiles separately
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', (teamMembersData as any[]).map((tm: any) => tm.user_id));

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

    return (teamMembersData as any[]).map((tm: any) => ({
      id: tm.id,
      team_id: tm.team_id,
      user_id: tm.user_id,
      role: tm.role,
      joined_at: tm.joined_at,
      profile: profilesMap.get(tm.user_id)
    }));
  };

  const createTeam = async (team: Partial<Team>) => {
    if (!currentBusinessId) return null;

    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('teams' as any)
      .insert([{
        name: team.name || '',
        description: team.description || null,
        department: team.department || null,
        color: team.color || '#3b82f6',
        is_active: team.is_active ?? true,
        business_id: currentBusinessId,
        created_by: user.user?.id
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Success',
      description: 'Team created successfully',
    });

    fetchTeams();
    return data as unknown as Team;
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    const { error } = await supabase
      .from('teams' as any)
      .update(updates)
      .eq('id', teamId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update team',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Team updated successfully',
    });

    fetchTeams();
    return true;
  };

  const deleteTeam = async (teamId: string) => {
    const { error } = await supabase
      .from('teams' as any)
      .delete()
      .eq('id', teamId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Team deleted successfully',
    });

    fetchTeams();
    return true;
  };

  const addTeamMember = async (teamId: string, userId: string, role: string = 'member') => {
    const { error } = await supabase
      .from('team_members' as any)
      .insert([{ team_id: teamId, user_id: userId, role }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add team member',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Team member added successfully',
    });

    return true;
  };

  const removeTeamMember = async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from('team_members' as any)
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Success',
      description: 'Team member removed successfully',
    });

    return true;
  };

  return {
    teams,
    loading,
    fetchTeams,
    fetchTeamMembers,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
  };
};
