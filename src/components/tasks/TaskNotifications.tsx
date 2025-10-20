import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckSquare, Check, X, Clock, AlertCircle, Calendar } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { downloadICS } from "@/lib/icsExport";

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: string;
  status: string;
}

interface TaskNotification {
  id: string;
  task_id: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  tasks: Task;
}

export const TaskNotifications = () => {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("task-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("task_notifications")
      .select(`
        *,
        tasks (
          id,
          title,
          description,
          due_date,
          priority,
          status
        )
      `)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    const typedData = data as TaskNotification[];
    setNotifications(typedData || []);
    setUnreadCount(typedData?.filter((n) => !n.is_read).length || 0);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("task_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    fetchNotifications();
  };

  const markTaskDone = async (taskId: string, notificationId: string) => {
    const { error: taskError } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", taskId);

    if (taskError) {
      toast({
        title: "Error",
        description: "Failed to mark task as done",
        variant: "destructive",
      });
      return;
    }

    const { error: notifError } = await supabase
      .from("task_notifications")
      .update({ is_dismissed: true })
      .eq("id", notificationId);

    if (notifError) {
      console.error("Error dismissing notification:", notifError);
    }

    toast({
      title: "Success",
      description: "Task marked as done",
    });

    fetchNotifications();
  };

  const dismissNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("task_notifications")
      .update({ is_dismissed: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error dismissing notification:", error);
      return;
    }

    fetchNotifications();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <CheckSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Task Notifications</h3>
          <Badge variant="secondary">{notifications.length}</Badge>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.is_read ? "bg-muted/30" : ""
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(notification.tasks.priority)}>
                          {notification.tasks.priority}
                        </Badge>
                        {isOverdue(notification.tasks.due_date) && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      
                      <p className="font-medium text-sm">{notification.tasks.title}</p>
                      
                      {notification.tasks.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.tasks.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Due: {format(new Date(notification.tasks.due_date), "PPp")}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadICS(notification.tasks);
                          toast({ title: "Calendar event exported" });
                        }}
                        title="Export to calendar"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          markTaskDone(notification.tasks.id, notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
