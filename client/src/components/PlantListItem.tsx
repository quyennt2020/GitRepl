import { Plant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Droplets, Sun, Pencil, Trash2, LineChart } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import PlantForm from "./PlantForm";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { Link } from "wouter";

interface PlantListItemProps {
  plant: Plant;
}

export default function PlantListItem({ plant }: PlantListItemProps) {
  const { toast } = useToast();
  const lastWateredDate = plant.lastWatered ? new Date(plant.lastWatered) : new Date();
  const daysSinceWatered = differenceInDays(new Date(), lastWateredDate);
  const needsWatering = daysSinceWatered >= plant.wateringInterval;

  const { mutate: deletePlant } = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/plants/${plant.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({ title: "Plant deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete plant",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent">
      <img
        src={plant.image}
        alt={plant.name}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <div className="flex-1 min-w-0">
        <Link href={`/plants/${plant.id}`} className="hover:underline">
          <h3 className="font-semibold truncate">{plant.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground truncate">{plant.species}</p>
        <div className="flex items-center gap-4 mt-1 text-sm">
          <span className="flex items-center gap-1">
            <Sun className="h-4 w-4" />
            {plant.sunlight}
          </span>
          <span className="flex items-center gap-1">
            <Droplets className={`h-4 w-4 ${needsWatering ? 'text-blue-500' : ''}`} />
            {needsWatering ? 'Needs water!' : `${plant.wateringInterval - daysSinceWatered} days until next watering`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Edit Plant</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <PlantForm plant={plant} />
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Plant</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {plant.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletePlant()}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
