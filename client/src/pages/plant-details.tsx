import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Plant, CareTask } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import WateringAnimation from "@/components/WateringAnimation";
import HealthTrend from "@/components/HealthTrend";
import TaskHistory from "@/components/TaskHistory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ClipboardList, ChevronLeft, ListOrdered } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AssignChainDialog from "@/components/assign-chain-dialog";

export default function PlantDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isChainDialogOpen, setIsChainDialogOpen] = useState(false);

  const { data: plant, isLoading } = useQuery<Plant>({
    queryKey: [`/api/plants/${id}`],
  });

  // Add explicit fetching of tasks
  const { data: tasks = [] } = useQuery<CareTask[]>({
    queryKey: [`/api/tasks`],
    select: (tasks) => tasks.filter(task => task.plantId === parseInt(id)),
  });

  const { mutate: markWatered } = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/plants/${id}`, {
        lastWatered: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plants/${id}`] });
      toast({ title: "Plant marked as watered" });
    },
    onError: () => {
      toast({
        title: "Failed to update watering status",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !plant) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <div className="h-[200px] bg-muted animate-pulse rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header with navigation */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Link href="/plants">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold">{plant.name}</h1>
          <p className="text-sm text-muted-foreground">{plant.species}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <img
              src={plant.image}
              alt={plant.name}
              className="w-full h-48 object-cover rounded-lg"
            />

            <div className="space-y-2">
              <WateringAnimation
                lastWatered={plant.lastWatered ? new Date(plant.lastWatered) : new Date()}
                wateringInterval={plant.wateringInterval}
              />
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  onClick={() => markWatered()}
                  className="w-full"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Watered
                </Button>
                <Link href={`/plants/${id}/tasks`}>
                  <Button variant="outline" className="w-full">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    View Tasks ({tasks.length})
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setIsChainDialogOpen(true)}
                  className="w-full"
                >
                  <ListOrdered className="w-4 h-4 mr-2" />
                  Assign Chain
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="health">Health Trend</TabsTrigger>
            <TabsTrigger value="history">Task History</TabsTrigger>
          </TabsList>
          <TabsContent value="health">
            <Card>
              <CardContent className="p-4">
                <HealthTrend plantId={parseInt(id)} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <TaskHistory plantId={parseInt(id)} />
          </TabsContent>
        </Tabs>

        <AssignChainDialog
          open={isChainDialogOpen}
          onClose={() => setIsChainDialogOpen(false)}
          plantId={parseInt(id)}
        />
      </div>
    </div>
  );
}