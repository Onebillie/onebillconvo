import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Edit, CheckCircle, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Staff {
  id: string;
  full_name: string;
  email: string;
  user_role?: 'superadmin' | 'admin' | 'agent';
  is_active: boolean;
  email_confirmed_at?: string;
}

export const StaffManagement = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "agent" as "agent" | "admin" | "superadmin",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      // Get current user's business
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!businessUser?.business_id) {
        console.error("No business found for user");
        return;
      }

      // Get all user IDs that belong to this business
      const { data: businessMembers } = await supabase
        .from("business_users")
        .select("user_id")
        .eq("business_id", businessUser.business_id);

      if (!businessMembers || businessMembers.length === 0) {
        setStaff([]);
        return;
      }

      const memberIds = businessMembers.map(m => m.user_id);

      // Fetch profiles for users in this business only
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberIds)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles from user_roles table
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Get auth user data to check email confirmation status
      const { data: usersData, error: usersError } = await supabase.functions.invoke("list-users-status");
      
      if (usersError) {
        console.error("Error fetching users:", usersError);
      }

      // Merge the data
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
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      });

      if (authError) throw authError;

      // Update seat count after adding new staff
      const { data: businessData } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", authData.user!.id)
        .single();

      if (businessData) {
        const { data: business } = await supabase
          .from("businesses")
          .select("seat_count, stripe_subscription_id")
          .eq("id", businessData.business_id)
          .single();

        if (business?.stripe_subscription_id) {
          // Update subscription seats
          try {
            const { data: seatUpdateData, error: seatError } = await supabase.functions.invoke(
              "update-subscription-seats",
              {
                body: {
                  businessId: businessData.business_id,
                  newSeatCount: (business.seat_count || 1) + 1,
                },
              }
            );

            if (seatError) {
              console.error("Failed to update seats:", seatError);
            } else if (seatUpdateData) {
              toast({
                title: "Subscription Updated",
                description: seatUpdateData.message,
              });
            }
          } catch (err) {
            console.error("Error updating seats:", err);
          }
        }
      }

      toast({
        title: "Success",
        description: "Staff member created successfully",
      });

      setDialogOpen(false);
      setFormData({ email: "", password: "", fullName: "", role: "agent" });
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

  const handleUpdateRole = async (staffId: string, newRole: "agent" | "admin" | "superadmin") => {
    try {
      // Delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", staffId);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: staffId, role: newRole });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleConfirmEmail = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-user-email", {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email confirmed successfully",
      });

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Staff Management</CardTitle>
            <CardDescription>Manage your team members and their roles</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>Create a new staff account</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email Status</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.full_name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Select
                    value={member.user_role || 'agent'}
                    onValueChange={(value: "agent" | "admin" | "superadmin") => handleUpdateRole(member.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {member.email_confirmed_at ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Confirmed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Mail className="w-3 h-3" />
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={member.is_active ? "default" : "secondary"}>
                    {member.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!member.email_confirmed_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfirmEmail(member.id)}
                        disabled={loading}
                      >
                        Confirm Email
                      </Button>
                    )}
                    <Button
                      variant="ghost"
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
        </div>
      </CardContent>
    </Card>
  );
};
