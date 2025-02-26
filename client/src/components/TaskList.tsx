import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CareTask, TaskTemplate } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clipboard, Edit2, Trash2, CheckCircle, Flag, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import EditTaskDialog from "./EditTaskDialog";
import TaskCompletionDialog from "./TaskCompletionDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TaskListProps {
  plantId: number;
}

// Enhanced priority styles with more visual cues
const priorityStyles = {
  high: {
    badge: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    border: "border-l-destructive",
    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
    background: "bg-destructive/5",
    hover: "hover:bg-destructive/10"
  },
  medium: {
    badge: "bg-warning text-warning-foreground hover:bg-warning/90",
    border: "border-l-warning",
    icon: <Flag className="h-4 w-4 text-warning" />,
    background: "bg-warning/5",
    hover: "hover:bg-warning/10"
  },
  low: {
    badge: "bg-muted text-muted-foreground hover:bg-muted/90",
    border: "border-l-muted",
    icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    background: "bg-muted/5",
    hover: "hover:bg-muted/10"
  }
};

// Rest of the imports remain unchanged

export default function TaskList({ plantId }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<CareTask | null>(null);
  const [completingTask, setCompletingTask] = useState<CareTask | null>(null);
  const { toast } = useToast();

  // Query tasks with plantId parameter
  const { data: tasks, refetch: refetchTasks } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks", { plantId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/tasks?plantId=${plantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return response.json();
    }
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (taskId: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/tasks/${taskId}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to delete task");
        }
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      refetchTasks(); // Explicitly refetch to ensure our list is up to date
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", plantId] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete task",
        description: error instanceof Error ? error.message : "The task may have already been deleted",
        variant: "destructive",
      });
      // Refetch to ensure our list is in sync with the server
      refetchTasks();
    },
  });

  const { mutate: updateTaskStatus } = useMutation({
    mutationFn: async ({ taskId, completed, checklistProgress }: { 
      taskId: number; 
      completed: boolean;
      checklistProgress?: Record<string, boolean>;
    }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        checklistProgress
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update task status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { plantId }] });
      toast({ title: "Task status updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      // Refetch to ensure our list is in sync with the server
      refetchTasks();
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
      {tasks?.map((task) => {
        const template = templates?.find(t => t.id === task.templateId);
        const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
        const priority = template?.priority || 'low';
        const priorityStyle = priorityStyles[priority as keyof typeof priorityStyles];

        return (
          <Card 
            key={task.id} 
            className={cn(
              "p-4 border-l-4",
              priorityStyle.border,
              priorityStyle.background,
              "transition-colors duration-200",
              priorityStyle.hover
            )}
          >
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
                  <CheckCircle 
                    className={cn(
                      "h-4 w-4",
                      task.completed && "text-primary fill-primary"
                    )} 
                  />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingTask(task)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this task? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTask(task.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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