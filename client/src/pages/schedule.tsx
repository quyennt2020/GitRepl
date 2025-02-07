import { useQuery, useMutation } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays, differenceInDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Droplets, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Schedule() {
  const { toast } = useToast();
  const { data: plants } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const { mutate: markWatered } = useMutation({
    mutationFn: async (plantId: number) => {
      await apiRequest("PATCH", `/api/plants/${plantId}`, {
        lastWatered: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({ title: "Plant marked as watered" });
    },
    onError: () => {
      toast({
        title: "Failed to update watering status",
        variant: "destructive",
      });
    },
  });

  const getPlantsDueForDate = (date: Date, plants: Plant[] = []) => {
    return plants.filter(plant => {
      if (!plant.lastWatered) return false;

      const lastWatered = new Date(plant.lastWatered);
      const daysSinceLastWater = differenceInDays(date, lastWatered);
      const daysUntilNextWatering = plant.wateringInterval - (daysSinceLastWater % plant.wateringInterval);

      // Only show plants that need water exactly on this date
      return daysUntilNextWatering === 0;
    });
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Care Schedule</h1>

      <div className="space-y-4">
        {next7Days.map(date => {
          const plantsForDate = getPlantsDueForDate(date, plants);
          const hasPlants = plantsForDate.length > 0;

          return (
            <Card key={date.toISOString()} className={!hasPlants ? 'opacity-60' : undefined}>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">
                  {format(date, "EEEE, MMM d")}
                </h2>
                <ScrollArea className="h-full max-h-[300px]">
                  {hasPlants ? (
                    <div className="space-y-2">
                      {plantsForDate.map(plant => (
                        <div 
                          key={plant.id} 
                          className="flex items-center gap-4 p-2 border rounded-lg border-blue-500"
                        >
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <p className="font-medium">{plant.name}</p>
                            <p className="text-sm text-muted-foreground">Due for watering</p>
                            <p className="text-xs text-muted-foreground">
                              {plant.wateringInterval} day watering interval
                            </p>
                          </div>
                          <Button 
                            className="w-full" 
                            onClick={() => markWatered(plant.id)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Watered
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No plants need care on this day
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}