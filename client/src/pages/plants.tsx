import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import PlantCard from "@/components/PlantCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import PlantForm from "@/components/PlantForm";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Plants() {
  const { data: plants, isLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
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
              <DialogTitle>{plants ? 'Add New Plant' : 'Edit Plant'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <PlantForm />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))
        ) : (
          plants?.map(plant => (
            <PlantCard key={plant.id} plant={plant} />
          ))
        )}
      </div>
    </div>
  );
}