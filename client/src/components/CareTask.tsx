import { useMutation } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Droplets, Sprout } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { differenceInDays } from "date-fns";

interface CareTaskProps {
  plant: Plant;
  date?: Date;
}

export default function CareTask({ plant, date = new Date() }: CareTaskProps) {
  const { mutate: updateTask } = useMutation({
    mutationFn: async (completed: boolean) => {
      await apiRequest("PATCH", `/api/tasks/${plant.id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
  });

  const daysSinceWatered = differenceInDays(date, new Date(plant.lastWatered));
  const daysSinceFertilized = differenceInDays(date, new Date(plant.lastFertilized));
  
  const needsWater = daysSinceWatered >= plant.wateringInterval;
  const needsFertilizer = daysSinceFertilized >= plant.fertilizingInterval;

  if (!needsWater && !needsFertilizer) return null;

  return (
    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
      <img 
        src={plant.image} 
        alt={plant.name}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <h3 className="font-medium">{plant.name}</h3>
        <div className="flex gap-3 text-sm text-muted-foreground">
          {needsWater && (
            <div className="flex items-center gap-1">
              <Droplets className="h-4 w-4" />
              Water
            </div>
          )}
          {needsFertilizer && (
            <div className="flex items-center gap-1">
              <Sprout className="h-4 w-4" />
              Fertilize
            </div>
          )}
        </div>
      </div>
      <Checkbox 
        onCheckedChange={(checked) => updateTask(checked as boolean)}
      />
    </div>
  );
}
