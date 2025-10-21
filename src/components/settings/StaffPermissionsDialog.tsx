import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Permission {
  name: string;
  category: string;
  description: string;
}

interface StaffPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export const StaffPermissionsDialog = ({
  open,
  onOpenChange,
  staffMember,
}: StaffPermissionsDialogProps) => {
  const { currentBusinessId } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && staffMember) {
      fetchPermissions();
    }
  }, [open, staffMember]);

  const fetchPermissions = async () => {
    if (!staffMember || !currentBusinessId) return;

    setLoading(true);
    try {
      // Fetch all available permissions
      const { data: permsData } = await supabase
        .from("granular_permissions")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      setPermissions(permsData || []);

      // Fetch user's current permissions
      const { data: userPermsData } = await supabase
        .from("user_granular_permissions")
        .select("permission_name")
        .eq("user_id", staffMember.id)
        .eq("business_id", currentBusinessId);

      setUserPermissions(userPermsData?.map((p: any) => p.permission_name) || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (permissionName: string) => {
    if (!staffMember || !currentBusinessId) return;

    const hasPermission = userPermissions.includes(permissionName);

    // Optimistic update
    if (hasPermission) {
      setUserPermissions(userPermissions.filter((p) => p !== permissionName));
    } else {
      setUserPermissions([...userPermissions, permissionName]);
    }

    try {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from("user_granular_permissions")
          .delete()
          .eq("user_id", staffMember.id)
          .eq("permission_name", permissionName)
          .eq("business_id", currentBusinessId);

        if (error) throw error;
      } else {
        // Grant permission
        const { error } = await supabase
          .from("user_granular_permissions")
          .insert([
            {
              user_id: staffMember.id,
              permission_name: permissionName,
              business_id: currentBusinessId,
            },
          ]);

        if (error) throw error;
      }
    } catch (error: any) {
      // Revert optimistic update on error
      if (hasPermission) {
        setUserPermissions([...userPermissions, permissionName]);
      } else {
        setUserPermissions(userPermissions.filter((p) => p !== permissionName));
      }

      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Success",
      description: "Permissions updated successfully",
    });
    onOpenChange(false);
  };

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Manage Permissions - {staffMember?.full_name}
          </DialogTitle>
          <DialogDescription>
            Control what {staffMember?.full_name} can access and manage
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{category}</Badge>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-3 pl-2">
                    {perms.map((perm) => {
                      const hasPermission = userPermissions.includes(perm.name);
                      return (
                        <div
                          key={perm.name}
                          className="flex items-start justify-between gap-4 py-2"
                        >
                          <div className="flex-1">
                            <Label
                              htmlFor={perm.name}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {perm.name.split(".")[1]?.replace(/_/g, " ")}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {perm.description}
                            </p>
                          </div>
                          <Switch
                            id={perm.name}
                            checked={hasPermission}
                            onCheckedChange={() => togglePermission(perm.name)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
