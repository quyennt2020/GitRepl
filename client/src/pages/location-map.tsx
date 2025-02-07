import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import PlantCard from "@/components/PlantCard";

export default function LocationMap() {
  const { data: plants, isLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const plantsByLocation = plants?.reduce((acc, plant) => {
    const location = plant.location || "Unspecified";
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(plant);
    return acc;
  }, {} as Record<string, Plant[]>);

  if (isLoading) {
    return (
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Location Map</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Location Map</h1>
      
      <div className="space-y-8">
        {plantsByLocation && Object.entries(plantsByLocation).map(([location, locationPlants]) => (
          <div key={location}>
            <h2 className="text-xl font-semibold mb-4 px-2">{location}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locationPlants.map(plant => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
