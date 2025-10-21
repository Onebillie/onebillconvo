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
import { Bell, Building2, CheckSquare, Mail, User, LogOut, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { InMailSheet } from "@/components/inmail/InMailSheet";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";

export const PersistentHeader = () => {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useGlobalNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [businessName, setBusinessName] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [inMailCount, setInMailCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [teamTasksCount, setTeamTasksCount] = useState(0);
  const [inMailSheetOpen, setInMailSheetOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  useEffect(() => {
    fetchBusinessAndTeamInfo();
    fetchNotificationCounts();
  }, [profile]);

  const fetchBusinessAndTeamInfo = async () => {
    if (!profile?.id) return;

    const { data: businessUser } = await supabase
      .from("business_users")
      .select("business_id, businesses(name)")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (businessUser?.businesses) {
      setBusinessName((businessUser.businesses as any).name);
    }

    const { data: teamMember } = await supabase
      .from("team_members" as any)
      .select("team_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (teamMember && 'team_id' in teamMember) {
      const { data: team } = await supabase
        .from("teams" as any)
        .select("name, department")
        .eq("id", teamMember.team_id)
        .single();
      
      if (team && 'department' in team && 'name' in team) {
        const dept = (team.department || team.name) as string;
        setDepartment(dept);
      }
    }
  };

  const fetchNotificationCounts = async () => {
    if (!profile?.id) return;

    const { count: inMailUnread } = await supabase
      .from("in_mail_messages" as any)
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .eq("is_read", false);

    setInMailCount(inMailUnread || 0);

    const { count: incompleteTasks } = await supabase
      .from("tasks" as any)
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", profile.id)
      .eq("completed", false);

    setTasksCount(incompleteTasks || 0);

    const { data: userTeams } = await supabase
      .from("team_members" as any)
      .select("team_id")
      .eq("user_id", profile.id);

    if (userTeams && userTeams.length > 0) {
      const teamIds = userTeams.map((tm: any) => tm.team_id);
      
      const { count: teamTasks } = await supabase
        .from("tasks" as any)
        .select("*", { count: "exact", head: true })
        .in("team_id", teamIds)
        .eq("completed", false);

      setTeamTasksCount(teamTasks || 0);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOnDashboard = location.pathname.includes('/dashboard');

  return (
    <div className="border-b bg-background sticky top-0 z-50 shadow-sm">
      <div className="flex h-16 items-center px-6 justify-between">
        {/* Left Section - Business Info & Dashboard Link */}
        <div className="flex items-center gap-4">
          {!isOnDashboard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/dashboard')}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Button>
          )}
          
          {businessName && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{businessName}</span>
              </div>
              {department && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
                  <span className="text-xs text-muted-foreground">{department}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section - Notifications & Profile */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* InMail Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setInMailSheetOpen(true)}
              title="InMail"
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

            {/* Personal Tasks Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/settings?tab=tasks")}
              title="My Tasks"
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

            {/* Team Tasks Notifications */}
            {teamTasksCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate("/settings?tab=tasks")}
                title="Team Tasks"
              >
                <CheckSquare className="w-5 h-5 text-primary" />
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {teamTasksCount}
                </Badge>
              </Button>
            )}

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
              <DropdownMenuItem onClick={() => setProfileEditOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings?tab=business")}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setInMailSheetOpen(true)}>
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
      </div>

      {/* Modals */}
      <InMailSheet open={inMailSheetOpen} onOpenChange={setInMailSheetOpen} />
      <ProfileEditDialog open={profileEditOpen} onOpenChange={setProfileEditOpen} />
    </div>
  );
};
