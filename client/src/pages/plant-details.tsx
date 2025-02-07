import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import WateringAnimation from "@/components/WateringAnimation";
import HealthTrend from "@/components/HealthTrend";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PlantDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const { data: plant, isLoading } = useQuery<Plant>({
    queryKey: [`/api/plants/${id}`],
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
    <div className="p-4 space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <img
            src={plant.image}
            alt={plant.name}
            className="w-full h-48 object-cover rounded-lg"
          />
          <div>
            <h1 className="text-2xl font-bold">{plant.name}</h1>
            <p className="text-muted-foreground">{plant.species}</p>
            <p className="text-sm">Location: {plant.location}</p>
          </div>
          
          <div className="space-y-2">
            <WateringAnimation
              lastWatered={plant.lastWatered ? new Date(plant.lastWatered) : new Date()}
              wateringInterval={plant.wateringInterval}
            />
            <Button 
              className="w-full" 
              onClick={() => markWatered()}
            >
              <Check className="w-4 h-4 mr-2" />
              Mark as Watered
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <HealthTrend plantId={parseInt(id)} />
        </CardContent>
      </Card>
    </div>
  );
}
