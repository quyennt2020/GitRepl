import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays, differenceInDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Droplets } from "lucide-react";

export default function Schedule() {
  const { data: plants } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const getPlantsDueForDate = (date: Date, plants: Plant[] = []) => {
    return plants.filter(plant => {
      if (!plant.lastWatered) return false;

      const lastWatered = new Date(plant.lastWatered);
      const daysSinceLastWater = differenceInDays(date, lastWatered);
      const daysUntilNextWatering = plant.wateringInterval - (daysSinceLastWater % plant.wateringInterval);

      // Plant needs water on this date if:
      // 1. It's exactly when the interval is up OR
      // 2. It's overdue and hasn't been watered yet
      return daysUntilNextWatering === 0 || (daysSinceLastWater >= plant.wateringInterval);
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
                      {plantsForDate.map(plant => {
                        const lastWatered = new Date(plant.lastWatered!);
                        const daysSinceLastWater = differenceInDays(date, lastWatered);
                        const isOverdue = daysSinceLastWater > plant.wateringInterval;
                        const nextScheduledDate = addDays(lastWatered, plant.wateringInterval);

                        return (
                          <div 
                            key={plant.id} 
                            className={`flex items-center gap-4 p-2 border rounded-lg ${
                              isOverdue ? 'border-red-500' : 'border-blue-500'
                            }`}
                          >
                            <Droplets className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`} />
                            <div className="flex-1">
                              <p className="font-medium">{plant.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {isOverdue 
                                  ? `${daysSinceLastWater - plant.wateringInterval} days overdue`
                                  : `Due today`
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last watered: {format(lastWatered, "MMM d")}
                                {" • "}
                                {plant.wateringInterval} day interval
                              </p>
                            </div>
                          </div>
                        );
                      })}
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