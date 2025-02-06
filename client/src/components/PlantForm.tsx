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

interface PlantFormProps {
  plant?: Plant;
}

const DEFAULT_PLANT_IMAGES = [
  "https://images.unsplash.com/photo-1604762524889-3e2fcc145683",
  "https://images.unsplash.com/photo-1518335935020-cfd6580c1ab4",
  "https://images.unsplash.com/photo-1592150621744-aca64f48394a",
  "https://images.unsplash.com/photo-1626965654957-fef1cb80d4b7"
];

export default function PlantForm({ plant }: PlantFormProps) {
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>(plant?.image || DEFAULT_PLANT_IMAGES[0]);

  const form = useForm<InsertPlant>({
    resolver: zodResolver(insertPlantSchema),
    defaultValues: {
      name: plant?.name ?? "",
      species: plant?.species ?? "",
      location: plant?.location ?? "",
      image: plant?.image ?? DEFAULT_PLANT_IMAGES[0],
      wateringInterval: plant?.wateringInterval ?? 7,
      fertilizingInterval: plant?.fertilizingInterval ?? 30,
      sunlight: (plant?.sunlight as "low" | "medium" | "high") ?? "medium",
      notes: plant?.notes ?? ""
    }
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: InsertPlant) => {
      const payload = {
        ...values,
        image: previewImage // Always use the current preview image
      };

      if (plant) {
        const response = await apiRequest("PATCH", `/api/plants/${plant.id}`, payload);
        return response;
      } else {
        const response = await apiRequest("POST", "/api/plants", payload);
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      toast({ 
        title: `Plant ${plant ? 'updated' : 'added'} successfully`,
        description: "Your changes have been saved."
      });

      if (!plant) {
        form.reset();
        setPreviewImage(DEFAULT_PLANT_IMAGES[0]);
      }

      setShowCamera(false);
    },
    onError: (error) => {
      console.error('Plant mutation error:', error);
      toast({
        title: `Failed to ${plant ? 'update' : 'add'} plant`,
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  });

  function handleImageCapture(imageUrl: string) {
    if (!imageUrl.startsWith('data:image/')) {
      toast({
        title: "Invalid Image",
        description: "Please provide a valid image",
        variant: "destructive"
      });
      return;
    }

    setPreviewImage(imageUrl);
    form.setValue("image", imageUrl);
    setShowCamera(false);
  }

  const onSubmit = async (values: InsertPlant) => {
    try {
      await mutate(values);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="image"
          render={() => (
            <FormItem>
              <FormLabel>Plant Photo</FormLabel>
              {showCamera ? (
                <CameraInput onCapture={handleImageCapture} />
              ) : (
                <div className="space-y-2">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={previewImage}
                      alt="Plant preview"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCamera(true)}
                  >
                    Change Photo
                  </Button>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

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
          name="wateringInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Watering Interval (days)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1} 
                  {...field} 
                  onChange={e => field.onChange(parseInt(e.target.value))} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fertilizingInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fertilizing Interval (days)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1} 
                  {...field} 
                  onChange={e => field.onChange(parseInt(e.target.value))} 
                />
              </FormControl>
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Additional notes" {...field} />
              </FormControl>
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