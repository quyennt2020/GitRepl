import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import PlantCard from "@/components/PlantCard";
import PlantListItem from "@/components/PlantListItem";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, LayoutGrid, List, Search } from "lucide-react";
import PlantForm from "@/components/PlantForm";
import { ScrollArea } from "@/components/ui/scroll-area";

type ViewMode = "grid" | "list";

export default function Plants() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [sunlightFilter, setSunlightFilter] = useState<string>("all");
  const [wateringFilter, setWateringFilter] = useState<string>("all");

  const { data: plants, isLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const filteredPlants = plants?.filter(plant => {
    const matchesSearch = plant.name.toLowerCase().includes(search.toLowerCase()) ||
                         plant.species.toLowerCase().includes(search.toLowerCase());
    const matchesSunlight = sunlightFilter === "all" || plant.sunlight === sunlightFilter;
    const lastWateredDate = plant.lastWatered ? new Date(plant.lastWatered) : new Date();
    const daysSinceWatered = Math.floor((new Date().getTime() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24));
    const needsWatering = daysSinceWatered >= plant.wateringInterval;

    const matchesWatering = wateringFilter === "all" ||
      (wateringFilter === "needs-water" && needsWatering) ||
      (wateringFilter === "watered" && !needsWatering);

    return matchesSearch && matchesSunlight && matchesWatering;
  });

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Plants</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
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
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={sunlightFilter} onValueChange={setSunlightFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sunlight" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sunlight</SelectItem>
              <SelectItem value="low">Low Light</SelectItem>
              <SelectItem value="medium">Medium Light</SelectItem>
              <SelectItem value="high">High Light</SelectItem>
            </SelectContent>
          </Select>

          <Select value={wateringFilter} onValueChange={setWateringFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Watering" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plants</SelectItem>
              <SelectItem value="needs-water">Needs Water</SelectItem>
              <SelectItem value="watered">Recently Watered</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredPlants?.map(plant => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlants?.map(plant => (
            <PlantListItem key={plant.id} plant={plant} />
          ))}
        </div>
      )}
    </div>
  );
}