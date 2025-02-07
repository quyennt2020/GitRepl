import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CareTask, TaskTemplate } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clipboard, Edit2, Trash2, CheckCircle, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import EditTaskDialog from "./EditTaskDialog";
import TaskCompletionDialog from "./TaskCompletionDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TaskListProps {
  plantId: number;
}

const priorityStyles = {
  high: {
    badge: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    border: "border-l-destructive",
    icon: <Flag className="h-4 w-4 text-destructive" />
  },
  medium: {
    badge: "bg-warning text-warning-foreground hover:bg-warning/90",
    border: "border-l-warning",
    icon: <Flag className="h-4 w-4 text-warning" />
  },
  low: {
    badge: "bg-muted text-muted-foreground hover:bg-muted/90",
    border: "border-l-muted",
    icon: <Flag className="h-4 w-4 text-muted-foreground" />
  }
};

export default function TaskList({ plantId }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<CareTask | null>(null);
  const [completingTask, setCompletingTask] = useState<CareTask | null>(null);
  const { toast } = useToast();

  const { data: tasks } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks", plantId],
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", plantId] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete task",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateTaskStatus } = useMutation({
    mutationFn: async ({ taskId, completed, checklistProgress }: { 
      taskId: number; 
      completed: boolean;
      checklistProgress?: Record<string, boolean>;
    }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        checklistProgress,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", plantId] });
      toast({ title: "Task status updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task status",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  if (!tasks?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clipboard className="mx-auto h-12 w-12 mb-4" />
        <h3 className="font-medium mb-1">No tasks yet</h3>
        <p className="text-sm">Create a new task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const template = templates?.find(t => t.id === task.templateId);
        const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
        const priority = template?.priority || 'low';
        const priorityStyle = priorityStyles[priority as keyof typeof priorityStyles];

        return (
          <Card key={task.id} className={`p-4 border-l-4 ${priorityStyle.border}`}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {priorityStyle.icon}
                  <span className="font-medium">{template?.name}</span>
                  <Badge 
                    variant={task.completed ? "secondary" : isOverdue ? "destructive" : "default"}
                  >
                    {task.completed ? "Completed" : isOverdue ? "Overdue" : "Active"}
                  </Badge>
                  <Badge className={priorityStyle.badge}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                </p>
                {task.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{task.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (task.completed) {
                      updateTaskStatus({ 
                        taskId: task.id, 
                        completed: false,
                        checklistProgress: {} 
                      });
                    } else {
                      setCompletingTask(task);
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingTask(task)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTask(task.id)}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

      {completingTask && (
        <TaskCompletionDialog
          templateId={completingTask.templateId}
          open={!!completingTask}
          onOpenChange={(open) => !open && setCompletingTask(null)}
          onComplete={(checklistProgress) => {
            updateTaskStatus({
              taskId: completingTask.id,
              completed: true,
              checklistProgress
            });
            setCompletingTask(null);
          }}
        />
      )}
    </div>
  );
}