import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertPlant, insertPlantSchema, type Plant } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import CameraInput from "./CameraInput";
import { useState } from "react";

const DEFAULT_PLANT_IMAGES = [
  "https://images.unsplash.com/photo-1604762524889-3e2fcc145683",
  "https://images.unsplash.com/photo-1518335935020-cfd6580c1ab4",
  "https://images.unsplash.com/photo-1592150621744-aca64f48394a",
  "https://images.unsplash.com/photo-1626965654957-fef1cb80d4b7"
];

interface PlantFormProps {
  plant?: Plant;
}

export default function PlantForm({ plant }: PlantFormProps) {
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);

  const form = useForm<InsertPlant>({
    resolver: zodResolver(insertPlantSchema),
    defaultValues: plant ? {
      name: plant.name,
      species: plant.species,
      location: plant.location,
      image: plant.image,
      wateringInterval: plant.wateringInterval,
      fertilizingInterval: plant.fertilizingInterval,
      sunlight: plant.sunlight,
      notes: plant.notes
    } : {
      name: "",
      species: "",
      location: "",
      image: DEFAULT_PLANT_IMAGES[0],
      wateringInterval: 7,
      fertilizingInterval: 30,
      sunlight: "medium",
      notes: ""
    }
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertPlant) => {
      if (plant) {
        await apiRequest("PATCH", `/api/plants/${plant.id}`, data);
      } else {
        await apiRequest("POST", "/api/plants", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({ title: `Plant ${plant ? 'updated' : 'added'} successfully` });
      form.reset();
      setShowCamera(false);
    },
    onError: () => {
      toast({ 
        title: `Failed to ${plant ? 'update' : 'add'} plant`,
        variant: "destructive"
      });
    }
  });

  function handleImageCapture(imageUrl: string) {
    form.setValue("image", imageUrl);
    setShowCamera(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Plant name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="species"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Species</FormLabel>
              <FormControl>
                <Input placeholder="Plant species" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Where is it kept?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plant Photo</FormLabel>
              {showCamera ? (
                <CameraInput onCapture={handleImageCapture} />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCamera(true)}
                >
                  Take Photo
                </Button>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sunlight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sunlight Needs</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sunlight needs" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low Light</SelectItem>
                  <SelectItem value="medium">Medium Light</SelectItem>
                  <SelectItem value="high">High Light</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? `${plant ? 'Updating' : 'Adding'}...` : plant ? 'Update Plant' : 'Add Plant'}
        </Button>
      </form>
    </Form>
  );
}