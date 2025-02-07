import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2, Grid, MoreHorizontal, PenLine, Check, Droplets, Sun, Plus } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PlantForm from "@/components/PlantForm"; // Assuming this component exists

type Position = { x: number; y: number };

export default function LocationMap() {
  const [isEditing, setIsEditing] = useState(false);
  const [savedPositions, setSavedPositions] = useState<Record<number, Position>>({});
  const [tempPositions, setTempPositions] = useState<Record<number, Position>>({});
  const [highlightedPlant, setHighlightedPlant] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: plants, isLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  // Load saved positions from plants data
  useEffect(() => {
    if (plants) {
      const positions: Record<number, Position> = {};
      plants.forEach((plant) => {
        if (plant.position) {
          try {
            positions[plant.id] = JSON.parse(plant.position as string);
          } catch (e) {
            console.error("Failed to parse position for plant:", plant.id);
          }
        }
      });
      setSavedPositions(positions);
      setTempPositions(positions); // Initialize temp positions with saved ones
    }
  }, [plants]);

  const { mutate: updatePlantPositions } = useMutation({
    mutationFn: async (positions: Record<number, Position>) => {
      // Update all changed positions in parallel
      await Promise.all(
        Object.entries(positions).map(([plantId, position]) =>
          apiRequest("PATCH", `/api/plants/${parseInt(plantId)}`, {
            position: JSON.stringify(position)
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({ title: "Plant positions updated" });
      setSavedPositions(tempPositions); // Update saved positions after successful save
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Failed to update plant positions",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (e: React.DragEvent, plantId: number) => {
    if (!isEditing) return;
    e.dataTransfer.setData("text/plain", plantId.toString());
    const elem = e.target as HTMLElement;
    elem.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const elem = e.target as HTMLElement;
    elem.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();

    const plantId = parseInt(e.dataTransfer.getData("text/plain"));
    if (isNaN(plantId)) return;

    const container = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;

    // Ensure coordinates are within bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));

    const newPosition = { x: boundedX, y: boundedY };
    setTempPositions(prev => ({
      ...prev,
      [plantId]: newPosition
    }));
  };

  const handleSave = () => {
    // Only update positions that have changed
    const changedPositions = Object.entries(tempPositions).reduce<Record<number, Position>>(
      (acc, [plantId, position]) => {
        const id = parseInt(plantId);
        if (JSON.stringify(position) !== JSON.stringify(savedPositions[id])) {
          acc[id] = position;
        }
        return acc;
      },
      {}
    );

    if (Object.keys(changedPositions).length > 0) {
      updatePlantPositions(changedPositions);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempPositions(savedPositions); // Reset to saved positions
    setIsEditing(false);
  };

  const getPlantStatus = (plant: Plant) => {
    const lastWateredDate = plant.lastWatered ? new Date(plant.lastWatered) : new Date();
    const daysSinceWatered = differenceInDays(new Date(), lastWateredDate);
    const needsWater = daysSinceWatered >= plant.wateringInterval;

    if (needsWater) {
      return {
        color: 'bg-red-400',
        tooltip: `${plant.name} (${plant.species}) - Needs water!`
      };
    } else if (daysSinceWatered >= plant.wateringInterval - 1) {
      return {
        color: 'bg-yellow-400',
        tooltip: `${plant.name} (${plant.species}) - Water tomorrow`
      };
    } else {
      return {
        color: 'bg-green-400',
        tooltip: `${plant.name} (${plant.species}) - ${plant.wateringInterval - daysSinceWatered} days until next watering`
      };
    }
  };

  const selectedPlant = plants?.find(p => p.id === highlightedPlant);

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

      {/* Legend */}
      {!isEditing && (
        <div className="px-4 py-2 flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <span>Watered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-yellow-400" />
            <span>Water Soon</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <span>Needs Water</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Resizable Layout */}
        <ResizablePanelGroup direction="horizontal">
          {/* Plant List Panel */}
          <ResizablePanel defaultSize={15} minSize={10}>
            <div className="h-full border-r bg-background">
              <div className="p-2 border-b">
                <h2 className="font-semibold">Plant Locations</h2>
              </div>
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="divide-y">
                  {plants?.map(plant => {
                    const status = getPlantStatus(plant);
                    const isHighlighted = highlightedPlant === plant.id;

                    return (
                      <div 
                        key={plant.id}
                        className={`flex items-center gap-1.5 p-1.5 cursor-pointer transition-colors ${
                          isHighlighted ? 'bg-accent' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setHighlightedPlant(plant.id === highlightedPlant ? null : plant.id)}
                      >
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        <img
                          src={plant.image}
                          alt={plant.name}
                          className="w-7 h-7 rounded-md object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{plant.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{plant.species}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Map and Details Area */}
          <ResizablePanel defaultSize={85}>
            <ResizablePanelGroup direction="vertical">
              {/* Map Area */}
              <ResizablePanel defaultSize={85}>
                <div className="h-full p-1 overflow-hidden">
                  <div 
                    className="relative w-full h-full bg-white rounded-lg shadow-sm flex items-center justify-center"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #E5E7EB 0.5px, transparent 0.5px)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '10px 10px',
                    }}
                  >
                    <div
                      className="relative w-full h-full max-w-[90%] max-h-[90%] aspect-square"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      {/* Room Layout */}
                      <div className="absolute inset-0 border border-gray-400">
                        <div className="absolute right-0 bottom-0 w-1/3 h-1/3 border-l border-t border-gray-400 bg-white" />
                      </div>

                      {/* Plant Indicators */}
                      {plants?.map((plant, index) => {
                        const defaultPosition = {
                          x: 25 + ((index % 2) * 50),
                          y: 25 + (Math.floor(index / 2) * 30)
                        };
                        const position = isEditing ? 
                          (tempPositions[plant.id] || defaultPosition) : 
                          (savedPositions[plant.id] || defaultPosition);

                        const status = getPlantStatus(plant);
                        const isHighlighted = highlightedPlant === plant.id;

                        return isEditing ? (
                          <div
                            key={plant.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, plant.id)}
                            onDragEnd={handleDragEnd}
                            className={`absolute w-4 h-4 cursor-move transition-transform hover:scale-125 ${status.color} ${
                              isHighlighted ? 'ring-2 ring-primary ring-offset-2' : ''
                            }`}
                            style={{
                              left: `${position.x}%`,
                              top: `${position.y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                            title={`Drag to move ${plant.name}`}
                          />
                        ) : (
                          <div
                            key={plant.id}
                            className={`absolute w-4 h-4 cursor-pointer transition-transform hover:scale-125 group ${status.color} ${
                              isHighlighted ? 'ring-2 ring-primary ring-offset-2' : ''
                            }`}
                            style={{
                              left: `${position.x}%`,
                              top: `${position.y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                            title={status.tooltip}
                            onClick={() => setHighlightedPlant(plant.id === highlightedPlant ? null : plant.id)}
                          >
                            <div className="absolute invisible group-hover:visible -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded shadow-lg whitespace-nowrap text-sm">
                              {plant.name}
                              <div className="text-xs text-muted-foreground">
                                {plant.species}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Selected Plant Details */}
              {selectedPlant ? (
                <ResizablePanel defaultSize={15}>
                  <div className="h-full bg-background p-3 border-t">
                    <div className="flex items-start gap-3">
                      <img
                        src={selectedPlant.image}
                        alt={selectedPlant.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{selectedPlant.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedPlant.species}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-sm">
                            <Sun className="h-4 w-4" />
                            {selectedPlant.sunlight}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-sm">
                            <Droplets className="h-4 w-4" />
                            Water every {selectedPlant.wateringInterval} days
                          </span>
                        </div>
                        <Link href={`/plants/${selectedPlant.id}`}>
                          <a className="mt-1 text-sm text-primary hover:underline">View Details</a>
                        </Link>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              ) : (
                <ResizablePanel defaultSize={15}>
                  <div className="h-full bg-background p-3 border-t flex items-center justify-center text-muted-foreground">
                    Select a plant to view details
                  </div>
                </ResizablePanel>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Floating Action Buttons */}
      {isEditing ? (
        <div className="fixed bottom-20 right-4 flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="shadow-lg"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button 
            className="shadow-lg gap-2"
            onClick={handleSave}
          >
            <Check className="h-4 w-4" />
            Save Layout
          </Button>
        </div>
      ) : (
        <div className="fixed bottom-20 right-4 flex flex-col gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="shadow-lg gap-2" size="icon">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Add New Plant</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <PlantForm />
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Button 
            className="shadow-lg gap-2"
            onClick={() => setIsEditing(true)}
          >
            <PenLine className="h-4 w-4" />
            Edit Layout
          </Button>
        </div>
      )}
    </div>
  );
}