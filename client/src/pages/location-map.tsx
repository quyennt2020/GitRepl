import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2, Grid, MoreHorizontal, PenLine, Check } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Position = { x: number; y: number };

export default function LocationMap() {
  const [isEditing, setIsEditing] = useState(false);
  const [positions, setPositions] = useState<Record<number, Position>>({});
  const { toast } = useToast();

  const { data: plants, isLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const { mutate: updatePlantPosition } = useMutation({
    mutationFn: async ({ plantId, position }: { plantId: number; position: Position }) => {
      await apiRequest("PATCH", `/api/plants/${plantId}`, {
        position: JSON.stringify(position)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({ title: "Plant position updated" });
    },
    onError: () => {
      toast({
        title: "Failed to update plant position",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (e: React.DragEvent, plantId: number) => {
    if (!isEditing) return;
    e.dataTransfer.setData("plant_id", plantId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();

    const plantId = parseInt(e.dataTransfer.getData("plant_id"));
    const container = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;

    setPositions(prev => ({
      ...prev,
      [plantId]: { x, y }
    }));

    updatePlantPosition({ plantId, position: { x, y } });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-[#F8FAFB]">
        <div className="animate-pulse p-4">
          <div className="h-[400px] bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFB]">
      {/* Top Navigation */}
      <div className="flex items-center gap-2 p-4">
        <Link href="/plants">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 flex justify-end gap-2">
          <Button variant="ghost" size="icon">
            <Grid className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 p-4 overflow-auto">
        <div 
          className="relative w-full aspect-square max-w-lg mx-auto bg-white rounded-lg shadow-sm"
          style={{
            backgroundImage: 'radial-gradient(circle, #E5E7EB 0.5px, transparent 0.5px)',
            backgroundSize: '20px 20px',
            backgroundPosition: '10px 10px'
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Room Layout */}
          <div className="absolute inset-8 border border-gray-400">
            {/* L-shaped room cutout */}
            <div className="absolute right-0 bottom-0 w-1/3 h-1/3 border-l border-t border-gray-400 bg-white" />
          </div>

          {/* Plant Indicators */}
          {plants?.map((plant, index) => {
            const position = positions[plant.id] || {
              x: 25 + ((index % 2) * 50),
              y: 25 + (Math.floor(index / 2) * 30)
            };

            return isEditing ? (
              <div
                key={plant.id}
                draggable
                onDragStart={(e) => handleDragStart(e, plant.id)}
                className="absolute w-4 h-4 bg-blue-400 cursor-move transition-all hover:brightness-110"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                title={`Drag to move ${plant.name}`}
              />
            ) : (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <a 
                  className="absolute w-4 h-4 bg-blue-400 cursor-pointer hover:brightness-110 transition-all"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={plant.name}
                />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="p-4 border-t bg-white">
        <Button 
          className="w-full gap-2"
          variant={isEditing ? "secondary" : "default"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <>
              <Check className="h-4 w-4" />
              Save Layout
            </>
          ) : (
            <>
              <PenLine className="h-4 w-4" />
              Edit Layout
            </>
          )}
        </Button>
      </div>
    </div>
  );
}