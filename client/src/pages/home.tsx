import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Plant, CareTask } from "@shared/schema";
import PlantCard from "@/components/PlantCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import QRScanner from "@/components/QRScanner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Home() {
  const { data: plants, isLoading: plantsLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const { data: tasks } = useQuery<CareTask[]>({
    queryKey: ["/api/tasks"],
  });

  const todaysTasks = tasks?.filter(task => {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString() && !task.completed;
  });

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Garden</h1>

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
                return (
                  <Link key={task.id} href={`/plants/${task.plantId}/tasks`}>
                    <div className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium">{plant?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Due {format(new Date(task.dueDate), "h:mm a")}
                        </p>
                      </div>
                      <Badge>
                        {task.completed ? "Completed" : "Due"}
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