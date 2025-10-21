import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Shield, CheckCircle, Mail, Settings, Users, Plus, Edit, UserCog } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StaffPermissionsDialog } from "./StaffPermissionsDialog";
import { EditStaffDialog } from "./EditStaffDialog";
import { Textarea } from "@/components/ui/textarea";

interface Staff {
  id: string;
  full_name: string;
  email: string;
  user_role?: 'superadmin' | 'admin' | 'agent';
  is_active: boolean;
  email_confirmed_at?: string;
  department?: string;
}

const DEPARTMENTS = ['Sales', 'Customer Service', 'Manager', 'Renewals', 'Technical Support', 'Billing'];
const TEAM_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const UnifiedStaffManagement = () => {
  const { isSuperAdmin } = useAuth();
  const { teams, loading: teamsLoading, createTeam, updateTeam, deleteTeam } = useTeams();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editStaffDialogOpen, setEditStaffDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  
  const [staffFormData, setStaffFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "agent" as "agent" | "admin" | "superadmin",
    department: "customer_service",
  });

  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: '',
    department: '',
    color: TEAM_COLORS[0],
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!businessUser?.business_id) return;

      const { data: businessMembers } = await supabase
        .from("business_users")
        .select("user_id")
        .eq("business_id", businessUser.business_id);

      if (!businessMembers || businessMembers.length === 0) {
        setStaff([]);
        return;
      }

      const memberIds = businessMembers.map(m => m.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberIds)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const { data: usersData } = await supabase.functions.invoke("list-users-status");

      const staffWithEmailStatus = profiles?.map(profile => {
        const authUser = usersData?.users?.find((u: any) => u.id === profile.id);
        const userRole = rolesData?.find((r: any) => r.user_id === profile.id);
        return {
          ...profile,
          email_confirmed_at: authUser?.email_confirmed_at,
          user_role: userRole?.role || 'agent'
        };
      }) || [];

      setStaff(staffWithEmailStatus);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      const { data: currentBusinessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!currentBusinessUser?.business_id) throw new Error("No business found");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: staffFormData.email,
        password: staffFormData.password,
        options: {
          data: {
            full_name: staffFormData.fullName,
            role: staffFormData.role,
            department: staffFormData.department,
            business_id: currentBusinessUser.business_id,
            business_role: 'member',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      await supabase
        .from('business_users')
        .upsert({
          business_id: currentBusinessUser.business_id,
          user_id: authData.user.id,
          role: 'member'
        });

      await supabase
        .from('user_roles')
        .upsert({
          user_id: authData.user.id,
          role: staffFormData.role
        });

      toast({
        title: "Success",
        description: "Staff member created successfully",
      });

      setStaffDialogOpen(false);
      setStaffFormData({ email: "", password: "", fullName: "", role: "agent", department: "customer_service" });
      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPermissions = (member: Staff) => {
    setSelectedStaff(member);
    setPermissionsDialogOpen(true);
  };

  const handleOpenTeamDialog = (team?: any) => {
    if (team) {
      setEditingTeam(team);
      setTeamFormData({
        name: team.name,
        description: team.description || '',
        department: team.department || '',
        color: team.color,
      });
    } else {
      setEditingTeam(null);
      setTeamFormData({
        name: '',
        description: '',
        department: '',
        color: TEAM_COLORS[0],
      });
    }
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (editingTeam) {
      await updateTeam(editingTeam.id, teamFormData);
    } else {
      await createTeam(teamFormData);
    }
    setTeamDialogOpen(false);
  };

  const handleToggleActive = async (staffId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", staffId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update staff status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Staff member ${!currentStatus ? "activated" : "deactivated"}`,
    });

    fetchStaff();
  };

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["team-members"]} className="space-y-4">
        {/* Team Members Section */}
        <AccordionItem value="team-members" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Team Members</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Staff Management</CardTitle>
                    <CardDescription>
                      Manage team members, roles, and permissions
                    </CardDescription>
                  </div>
                  <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Staff
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Staff Member</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateStaff} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            value={staffFormData.fullName}
                            onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={staffFormData.email}
                            onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input
                            type="password"
                            value={staffFormData.password}
                            onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                            required
                            minLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={staffFormData.role} onValueChange={(value: any) => setStaffFormData({ ...staffFormData, role: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="superadmin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Select value={staffFormData.department} onValueChange={(value) => setStaffFormData({ ...staffFormData, department: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map(dept => (
                                <SelectItem key={dept} value={dept.toLowerCase().replace(/ /g, '_')}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setStaffDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Staff"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.department || 'Not set'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {member.user_role === 'superadmin' ? 'Super Admin' : 
                             member.user_role === 'admin' ? 'Admin' : 'Agent'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.is_active ? "default" : "secondary"}>
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedStaff(member);
                                setEditStaffDialogOpen(true);
                              }}
                            >
                              <UserCog className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPermissions(member)}
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Permissions
                            </Button>
                            <Button
                              variant={member.is_active ? "secondary" : "default"}
                              size="sm"
                              onClick={() => handleToggleActive(member.id, member.is_active)}
                            >
                              {member.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Teams & Departments Section */}
        <AccordionItem value="teams" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Teams & Departments</h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Organize your staff into teams for better collaboration
              </p>
              <Button onClick={() => handleOpenTeamDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenTeamDialog(team)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTeam(team.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {team.department && <Badge variant="secondary">{team.department}</Badge>}
                  </CardHeader>
                  <CardContent>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{team.member_count || 0} members</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Team Name</Label>
              <Input
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={teamFormData.department} onValueChange={(value) => setTeamFormData({ ...teamFormData, department: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={teamFormData.description}
                onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Team Color</Label>
              <div className="flex gap-2 mt-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      teamFormData.color === color ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTeamFormData({ ...teamFormData, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTeam}>{editingTeam ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <StaffPermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        staffMember={selectedStaff}
      />

      {/* Edit Staff Dialog */}
      <EditStaffDialog
        open={editStaffDialogOpen}
        onOpenChange={setEditStaffDialogOpen}
        staffMember={selectedStaff}
        onUpdate={fetchStaff}
      />
    </div>
  );
};
