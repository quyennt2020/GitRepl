import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Droplets, Sun, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import PlantForm from "./PlantForm";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlantCardProps {
  plant: Plant;
}

export default function PlantCard({ plant }: PlantCardProps) {
  const { toast } = useToast();

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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <AspectRatio ratio={1}>
        <img 
          src={plant.image} 
          alt={plant.name}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold truncate">{plant.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{plant.species}</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
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

        <div className="flex items-center gap-3">
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