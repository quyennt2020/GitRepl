import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CareTask, TaskTemplate } from "@shared/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clipboard, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import EditTaskDialog from "./EditTaskDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TaskListProps {
  plantId: number;
}

export default function TaskList({ plantId }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<CareTask | null>(null);
  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks", plantId],
    queryFn: () => apiRequest("GET", `/api/tasks?plantId=${plantId}`),
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete task" }));
        throw new Error(errorData.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", plantId] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error) => {
      // Always refresh the task list to ensure UI is in sync with server state
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", plantId] });

      if (error instanceof Error) {
        const isExpectedError = 
          error.message.includes('not found') || 
          error.message.includes('Invalid task ID');

        if (!isExpectedError) {
          toast({
            title: "Failed to delete task",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    },
  });

  if (tasksLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i} className="p-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="mt-2 space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </Card>
      ))}
    </div>;
  }

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

  return (
    <>
      <Accordion type="single" collapsible className="space-y-4">
        {tasks?.map(task => {
          const template = templates?.find(t => t.id === task.templateId);
          const progress = task.checklistProgress as Record<string, boolean> || {};
          const isOverdue = new Date(task.dueDate) < new Date();

          return (
            <AccordionItem key={task.id} value={task.id.toString()}>
              <Card>
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template?.name}</span>
                        <Badge variant={task.completed ? "secondary" : isOverdue ? "destructive" : "default"}>
                          {task.completed ? "Completed" : isOverdue ? "Overdue" : "Active"}
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
                            <AlertDialogAction
                              onClick={(e) => handleDeleteClick(e, task.id)}
                            >
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
    </>
  );
}