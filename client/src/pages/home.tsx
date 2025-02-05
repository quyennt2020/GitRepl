import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import PlantCard from "@/components/PlantCard";
import CareTask from "@/components/CareTask";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const { data: plants, isLoading: plantsLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Garden</h1>
      
      <Card>
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold mb-4">Today's Tasks</h2>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {plants?.map(plant => (
                <CareTask key={plant.id} plant={plant} />
              ))}
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
