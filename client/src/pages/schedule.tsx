import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays, isAfter, isSameDay, addWeeks } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Droplets } from "lucide-react";

export default function Schedule() {
  const { data: plants } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const getNextWateringDate = (plant: Plant) => {
    const lastWatered = plant.lastWatered ? new Date(plant.lastWatered) : new Date();
    return addDays(lastWatered, plant.wateringInterval);
  };

  const getPlantsDueForDate = (date: Date, plants: Plant[] = []) => {
    return plants.filter(plant => {
      const nextWateringDate = getNextWateringDate(plant);
      return isSameDay(date, nextWateringDate) || isAfter(date, nextWateringDate);
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
                        const nextWatering = getNextWateringDate(plant);
                        const isOverdue = isAfter(date, nextWatering);

                        return (
                          <div 
                            key={plant.id} 
                            className={`flex items-center gap-2 p-2 border rounded-lg ${
                              isOverdue ? 'border-red-500' : 'border-blue-500'
                            }`}
                          >
                            <Droplets className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`} />
                            <div>
                              <p className="font-medium">{plant.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {isOverdue 
                                  ? 'Overdue for watering'
                                  : 'Due for watering'
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Next watering: {format(nextWatering, "MMM d")}
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