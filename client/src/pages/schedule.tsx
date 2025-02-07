import { useQuery, useMutation } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      lastWatered.setHours(0, 0, 0, 0);

      const daysSinceLastWater = Math.floor((date.getTime() - lastWatered.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLastWater % plant.wateringInterval === 0;
    });
  };

  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-3xl font-bold">Care Schedule</h1>

      <div className="space-y-4">
        {next7Days.map(date => {
          const plantsForDate = getPlantsDueForDate(date, plants);
          const hasPlants = plantsForDate.length > 0;

          return (
            <Card key={date.toISOString()} className={!hasPlants ? 'bg-muted/50' : undefined}>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">
                  {format(date, "EEEE, MMM d")}
                </h2>
                {hasPlants ? (
                  <div className="space-y-2">
                    {plantsForDate.map(plant => (
                      <div 
                        key={plant.id} 
                        className="flex items-center justify-between gap-4 p-4 border rounded-lg border-primary/20 bg-card"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{plant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Due for watering
                          </p>
                        </div>
                        <Button 
                          onClick={() => markWatered(plant.id)}
                          className="shrink-0"
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}