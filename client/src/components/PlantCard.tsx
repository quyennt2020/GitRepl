import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Droplets, Sun } from "lucide-react";

interface PlantCardProps {
  plant: Plant;
}

export default function PlantCard({ plant }: PlantCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <AspectRatio ratio={1}>
        <img 
          src={plant.image} 
          alt={plant.name}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      <CardContent className="p-3">
        <h3 className="font-semibold truncate">{plant.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{plant.species}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-xs">
            <Droplets className="h-3 w-3" />
            {plant.wateringInterval}d
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Sun className="h-3 w-3" />
            {plant.sunlight}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
