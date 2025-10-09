import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  priority_score?: number;
  status: string;
  due_date: string;
  assigned_to: string | null;
  customer: { name: string } | null;
  assignee: { full_name: string } | null;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'overdue'>('all');

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let query = supabase
      .from('tasks')
      .select(`
        *,
        customer:customers(name),
        assignee:profiles!tasks_assigned_to_fkey(full_name)
      `)
      .in('status', ['pending', 'in_progress'])
      .order('priority_score', { ascending: false })
      .order('due_date', { ascending: true });

    if (filter === 'mine') {
      query = query.eq('assigned_to', session.user.id);
    } else if (filter === 'overdue') {
      query = query.lt('due_date', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
      return;
    }

    setTasks(data || []);
    setLoading(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Task status updated",
    });

    fetchTasks();
  };

  const getPriorityColor = (priorityScore?: number) => {
    if (!priorityScore) return 'outline';
    if (priorityScore >= 8) return 'destructive';
    if (priorityScore >= 6) return 'default';
    if (priorityScore >= 4) return 'secondary';
    return 'outline';
  };

  const isOverdue = (dueDate: string) => isPast(new Date(dueDate));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'mine' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('mine')}
            >
              My Tasks
            </Button>
            <Button
              variant={filter === 'overdue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('overdue')}
            >
              Overdue
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tasks found</div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getPriorityColor(task.priority_score)}>
                          Priority {task.priority_score || 5}
                        </Badge>
                        {isOverdue(task.due_date) && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.customer && (
                          <span>Customer: {task.customer.name}</span>
                        )}
                        {task.assignee && (
                          <span>Assigned to: {task.assignee.full_name}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {task.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        >
                          Start
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}