import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Edit, Key, Shield } from "lucide-react";

interface EnterpriseUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface EnterpriseUserManagementProps {
  businessId: string;
  businessName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EnterpriseUserManagement({
  businessId,
  businessName,
  open,
  onOpenChange
}: EnterpriseUserManagementProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<EnterpriseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<EnterpriseUser | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    role: "agent",
    newPassword: ""
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, businessId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users in this business
      const { data: businessUsers, error: buError } = await supabase
        .from("business_users")
        .select("user_id, role")
        .eq("business_id", businessId);

      if (buError) throw buError;

      const userIds = businessUsers?.map(bu => bu.user_id) || [];
      
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      // Get profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active, created_at")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Merge data
      const usersData = (profiles || []).map(p => ({
        ...p,
        role: (roles || []).find((r: any) => r.user_id === p.id)?.role || 
              businessUsers?.find(bu => bu.user_id === p.id)?.role || 
              "agent"
      })) as EnterpriseUser[];

      setUsers(usersData);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: EnterpriseUser) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      newPassword: ""
    });
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("admin-manage-enterprise-user", {
        body: {
          userId: editUser.id,
          full_name: editForm.full_name,
          email: editForm.email,
          role: editForm.role,
          newPassword: editForm.newPassword || undefined
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: "User updated successfully"
      });

      setEditUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Update user error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      superadmin: "destructive",
      admin: "default",
      agent: "secondary"
    };
    return <Badge variant={variants[role] || "secondary"}>{role}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users in {businessName}
            </DialogTitle>
            <DialogDescription>
              Manage users and their roles for this enterprise account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading && users.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {users.length === 0 && !loading && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No users found in this account</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details, role, and credentials
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">
                <Shield className="h-4 w-4 inline mr-1" />
                Role
              </Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">
                <Key className="h-4 w-4 inline mr-1" />
                New Password (optional)
              </Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={editForm.newPassword}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
