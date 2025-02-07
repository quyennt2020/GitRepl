import { useQuery } from "@tanstack/react-query";
import { CareTask, TaskTemplate, ChecklistItem } from "@shared/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clipboard, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TaskListProps {
  plantId: number;
}

export default function TaskList({ plantId }: TaskListProps) {
  const { data: tasks, isLoading: tasksLoading } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks", plantId],
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { data: checklistItems } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/task-templates/checklist"],
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

  return (
    <Accordion type="single" collapsible className="space-y-4">
      {tasks.map(task => {
        const template = templates?.find(t => t.id === task.templateId);
        const items = checklistItems?.filter(item => item.templateId === task.templateId) || [];
        const progress = task.checklistProgress as Record<string, boolean> || {};
        const completedItems = items.filter(item => progress[item.id]);
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
                  <div className="text-sm text-muted-foreground">
                    {completedItems.length}/{items.length} completed
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

                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={progress[item.id]}
                          className="mt-1"
                          disabled={task.completed}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`item-${item.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {item.text}
                          </label>
                          {!item.required && (
                            <p className="text-xs text-muted-foreground">Optional</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

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
  );
}
