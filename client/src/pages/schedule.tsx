import { useQuery } from "@tanstack/react-query";
import { Plant, CareTask, TaskTemplate } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Schedule() {
  const { toast } = useToast();
  const { data: plants } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const { data: tasks } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const getTasksForDate = (date: Date) => {
    return tasks?.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate.toDateString() === date.toDateString();
    }) || [];
  };

  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-3xl font-bold">Care Schedule</h1>

      <div className="space-y-4">
        {next7Days.map(date => {
          const tasksForDate = getTasksForDate(date);
          const hasActiveTasks = tasksForDate.length > 0;

          return (
            <Card key={date.toISOString()} className={!hasActiveTasks ? 'bg-muted/50' : undefined}>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">
                  {format(date, "EEEE, MMM d")}
                </h2>
                {hasActiveTasks ? (
                  <div className="space-y-2">
                    {tasksForDate.map(task => {
                      const plant = plants?.find(p => p.id === task.plantId);
                      const template = templates?.find(t => t.id === task.templateId);

                      return (
                        <Link key={task.id} href={`/plants/${task.plantId}/tasks`}>
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{plant?.name}</p>
                                <Badge variant="outline">{template?.name}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Due {format(new Date(task.dueDate), "h:mm a")}
                              </p>
                            </div>
                            <Badge variant={task.completed ? "secondary" : "default"}>
                              {task.completed ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Done
                                </span>
                              ) : "Due"}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No tasks scheduled for this day
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}