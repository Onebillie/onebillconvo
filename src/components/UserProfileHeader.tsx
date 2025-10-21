import { useAuth } from "@/contexts/AuthContext";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bell, Building2, CheckSquare, Mail, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const UserProfileHeader = () => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useGlobalNotifications();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState<string>("");
  const [inMailCount, setInMailCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);

  useEffect(() => {
    fetchBusinessName();
    fetchNotificationCounts();
  }, [profile]);

  const fetchBusinessName = async () => {
    if (!profile?.id) return;

    const { data: businessUser } = await supabase
      .from("business_users")
      .select("business_id, businesses(name)")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (businessUser?.businesses) {
      setBusinessName((businessUser.businesses as any).name);
    }
  };

  const fetchNotificationCounts = async () => {
    if (!profile?.id) return;

    // Fetch unread InMail count
    const { count: inMailUnread } = await supabase
      .from("in_mail_messages" as any)
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .eq("is_read", false);

    setInMailCount(inMailUnread || 0);

    // Fetch incomplete tasks count
    const { count: incompleteTasks } = await supabase
      .from("tasks" as any)
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", profile.id)
      .eq("completed", false);

    setTasksCount(incompleteTasks || 0);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-4">
      {businessName && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{businessName}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* InMail Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate("/settings?tab=inmail")}
        >
          <Mail className="w-5 h-5" />
          {inMailCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {inMailCount}
            </Badge>
          )}
        </Button>

        {/* Tasks Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate("/settings?tab=tasks")}
        >
          <CheckSquare className="w-5 h-5" />
          {tasksCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {tasksCount}
            </Badge>
          )}
        </Button>

        {/* All Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* User Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-auto py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                {profile?.full_name ? getInitials(profile.full_name) : "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{profile?.full_name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
              <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings?tab=business")}>
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings?tab=inmail")}>
            <Mail className="mr-2 h-4 w-4" />
            InMail
            {inMailCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {inMailCount}
              </Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings?tab=tasks")}>
            <CheckSquare className="mr-2 h-4 w-4" />
            My Tasks
            {tasksCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {tasksCount}
              </Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
