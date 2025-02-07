import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CareTask, TaskTemplate } from "@shared/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clipboard, AlertCircle, Edit2, Trash2, CheckCircle } from "lucide-react";
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
  high: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  medium: "bg-warning text-warning-foreground hover:bg-warning/90",
  low: "bg-muted text-muted-foreground hover:bg-muted/90",
} as const;

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
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", plantId] });
      if (error instanceof Error) {
        toast({
          title: "Failed to delete task",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const { mutate: updateTaskStatus } = useMutation({
    mutationFn: async ({ 
      taskId, 
      completed, 
      checklistProgress 
    }: { 
      taskId: number; 
      completed: boolean;
      checklistProgress?: Record<string, boolean>;
    }) => {
      const updateData = {
        completed,
        completedAt: completed ? new Date() : null,
        checklistProgress,
      };
      await apiRequest("PATCH", `/api/tasks/${taskId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", plantId] });
      toast({ title: "Task status updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  if (!tasks?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clipboard className="mx-auto h-12 w-12 mb-4" />
        <h3 className="font-medium mb-1">No tasks yet</h3>
        <p className="text-sm">Create a new task from a template to get started</p>
      </div>
    );
  }

  const handleDeleteClick = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    deleteTask(taskId);
  };

  const handleStatusToggle = (e: React.MouseEvent, task: CareTask) => {
    e.stopPropagation();
    if (task.completed) {
      // For uncompleting a task, just update the status
      updateTaskStatus({ 
        taskId: task.id, 
        completed: false,
        checklistProgress: {} 
      });
    } else {
      // For completing a task, open the completion dialog
      setCompletingTask(task);
    }
  };

  const handleTaskCompletion = (checklistProgress: Record<string, boolean>) => {
    if (completingTask) {
      updateTaskStatus({
        taskId: completingTask.id,
        completed: true,
        checklistProgress
      });
      setCompletingTask(null);
    }
  };

  return (
    <>
      <Accordion type="single" collapsible className="space-y-4">
        {tasks.map(task => {
          const template = templates?.find(t => t.id === task.templateId);
          const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
          const priority = template?.priority || 'low';

          return (
            <AccordionItem key={task.id} value={task.id.toString()}>
              <Card className={`border-l-4 ${
                isOverdue ? 'border-l-destructive' : 
                priority === 'high' ? 'border-l-destructive' :
                priority === 'medium' ? 'border-l-warning' :
                'border-l-muted'
              }`}>
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template?.name}</span>
                        <Badge variant={task.completed ? "secondary" : isOverdue ? "destructive" : "default"}>
                          {task.completed ? "Completed" : isOverdue ? "Overdue" : "Active"}
                        </Badge>
                        <Badge className={priorityStyles[priority as keyof typeof priorityStyles]}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleStatusToggle(e, task)}
                        className={task.completed ? "text-muted-foreground" : "text-primary"}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                            className="text-destructive"
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
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => handleDeleteClick(e, task.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="px-4 pb-4 pt-2 space-y-4">
                    {isOverdue && !task.completed && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        This task is overdue
                      </div>
                    )}

                    {task.notes && (
                      <div className="text-sm text-muted-foreground">
                        <strong className="font-medium">Notes:</strong> {task.notes}
                      </div>
                    )}

                    {task.checklistProgress && Object.keys(task.checklistProgress).length > 0 && (
                      <div className="text-sm">
                        <strong className="font-medium">Completion Checklist:</strong>
                        <ul className="mt-2 space-y-1">
                          {Object.entries(task.checklistProgress as Record<string, boolean>).map(([id, checked]) => (
                            <li key={id} className="flex items-center gap-2">
                              <CheckCircle className={`h-4 w-4 ${checked ? "text-primary" : "text-muted"}`} />
                              <span className={checked ? "line-through text-muted-foreground" : ""}>
                                {templates?.find(t => t.id === task.templateId)?.name} - Step {parseInt(id) + 1}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>

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
          onComplete={handleTaskCompletion}
        />
      )}
    </>
  );
}