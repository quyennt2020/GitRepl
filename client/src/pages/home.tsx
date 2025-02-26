import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Plant, CareTask, TaskTemplate } from "@shared/schema";
import PlantCard from "@/components/PlantCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import QRScanner from "@/components/QRScanner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { AlertCircle, Flag, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function Home() {
  const { data: plants, isLoading: plantsLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const { data: tasks } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const todaysTasks = tasks?.filter(task => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString() && !task.completed;
  });

  return (
    <div className="container mobile-container space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Garden</h1>

      <QRScanner />

      <Card>
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold mb-4">Today's Tasks</h2>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {todaysTasks?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No tasks due today
                </p>
              )}
              {todaysTasks?.map(task => {
                const plant = plants?.find(p => p.id === task.plantId);
                const template = templates?.find(t => t.id === task.templateId);
                const priority = template?.priority || 'low';
                const priorityStyle = priorityStyles[priority as keyof typeof priorityStyles];

                return (
                  <Link key={task.id} href={`/plants/${task.plantId}/tasks`}>
                    <div 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer border-l-4",
                        priorityStyle.border,
                        priorityStyle.background,
                        "hover:bg-accent/10"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {priorityStyle.icon}
                          <p className="font-medium">{plant?.name}</p>
                          <Badge variant="outline">{template?.name}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Due {format(new Date(task.dueDate), "h:mm a")}
                        </p>
                      </div>
                      <Badge className={priorityStyle.badge}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold">Recent Plants</h2>
      <div className="grid grid-cols-2 gap-4">
        {plantsLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))
        ) : (
          plants?.slice(0, 4).map(plant => (
            <PlantCard key={plant.id} plant={plant} />
          ))
        )}
      </div>
    </div>
  );
}