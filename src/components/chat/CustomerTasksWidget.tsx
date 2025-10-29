import { useState, useEffect } from 'react';
import { Plus, Calendar, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { TaskDialog } from '../tasks/TaskDialog';

interface CustomerTasksWidgetProps {
  customerId: string;
  conversationId?: string;
}

export const CustomerTasksWidget = ({ customerId, conversationId }: CustomerTasksWidgetProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    fetchTasks();
  }, [customerId]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned:profiles!tasks_assigned_to_fkey(full_name)
      `)
      .eq('customer_id', customerId)
      .order('due_date', { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
  };

  const toggleSubtask = async (task: any, subtaskIndex: number) => {
    const updatedSubtasks = [...(task.subtasks || [])];
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      completed: !updatedSubtasks[subtaskIndex].completed,
    };

    const completedCount = updatedSubtasks.filter(s => s.completed).length;
    const percentage = Math.round((completedCount / updatedSubtasks.length) * 100);

    const { error } = await supabase
      .from('tasks')
      .update({
        subtasks: updatedSubtasks,
        completion_percentage: percentage,
      })
      .eq('id', task.id);

    if (!error) {
      fetchTasks();
    }
  };

  const completeTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completion_percentage: 100,
      })
      .eq('id', taskId);

    if (!error) {
      toast({ title: 'Task completed' });
      fetchTasks();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Tasks ({pendingTasks.length} pending)</h3>
        <Button size="sm" onClick={() => {
          setSelectedTask(null);
          setShowTaskDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {pendingTasks.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground">
          No pending tasks for this customer
        </Card>
      ) : (
        <div className="space-y-2">
          {pendingTasks.map((task) => (
            <Card key={task.id} className="p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority}
                    </Badge>
                    {task.auto_created && (
                      <Badge variant="outline" className="text-xs">
                        Auto
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => completeTask(task.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>

              {task.subtasks && task.subtasks.length > 0 && (
                <div className="space-y-2 mb-2">
                  <Progress value={task.completion_percentage || 0} className="h-1" />
                  {task.subtasks.map((subtask: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => toggleSubtask(task, idx)}
                      />
                      <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                    </span>
                  </div>
                )}
                {task.assigned && (
                  <div className="flex items-center gap-1">
                    Assigned to {task.assigned.full_name}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {completedTasks.length} completed tasks
          </summary>
          <div className="space-y-1 mt-2">
            {completedTasks.map((task) => (
              <div key={task.id} className="text-muted-foreground line-through">
                {task.title}
              </div>
            ))}
          </div>
        </details>
      )}

      {showTaskDialog && (
        <TaskDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          task={selectedTask}
          customerId={customerId}
          conversationId={conversationId}
          onSuccess={fetchTasks}
        />
      )}
    </div>
  );
};
