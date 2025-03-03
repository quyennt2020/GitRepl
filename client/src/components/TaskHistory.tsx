import { useQuery } from "@tanstack/react-query";
import { CareTask, TaskTemplate } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertCircle, Flag, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskHistoryProps {
  plantId: number;
}

// Priority styles matching TaskList component
const priorityStyles = {
  high: {
    badge: "bg-destructive text-destructive-foreground",
    border: "border-l-destructive",
    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
    background: "bg-destructive/5",
  },
  medium: {
    badge: "bg-warning text-warning-foreground",
    border: "border-l-warning",
    icon: <Flag className="h-4 w-4 text-warning" />,
    background: "bg-warning/5",
  },
  low: {
    badge: "bg-muted text-muted-foreground",
    border: "border-l-muted",
    icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    background: "bg-muted/5",
  }
};

export default function TaskHistory({ plantId }: TaskHistoryProps) {
  const { data: tasks } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks", { plantId }],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?plantId=${plantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      return response.json();
    }
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  // Sort tasks by completedAt date, most recent first
  const completedTasks = tasks
    ?.filter(task => task.completed && task.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  if (!completedTasks?.length) {
    return (
      <Card className="p-4">
        <p className="text-center text-muted-foreground">No completed tasks yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {completedTasks.map((task) => {
        const template = templates?.find(t => t.id === task.templateId);
        const priority = template?.priority || 'low';
        const priorityStyle = priorityStyles[priority as keyof typeof priorityStyles];

        return (
          <Card 
            key={task.id} 
            className={cn(
              "p-4 border-l-4",
              priorityStyle.border,
              priorityStyle.background,
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {priorityStyle.icon}
                  <span className="font-medium">{template?.name}</span>
                  <Badge variant="outline">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Completed {format(new Date(task.completedAt!), "PPP 'at' p")}
                </p>
                {task.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    "{task.notes}"
                  </p>
                )}
              </div>
              <Badge className={priorityStyle.badge}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
