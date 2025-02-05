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
import { Camera } from "lucide-react";

interface PlantFormProps {
  plant?: Plant;
  onSuccess?: () => void;
}

export default function PlantForm({ plant, onSuccess }: PlantFormProps) {
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
      sunlight: plant.sunlight as "low" | "medium" | "high",
      notes: plant.notes || ""
    } : {
      name: "",
      species: "",
      location: "",
      image: "",
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
      toast({ 
        title: plant ? "Plant updated successfully" : "Plant added successfully",
        description: plant ? "Your plant has been updated" : "Your new plant has been added"
      });
      form.reset();
      setShowCamera(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Form submission error:', error);
      toast({ 
        title: `Failed to ${plant ? 'update' : 'add'} plant`,
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });
    }
  });

  function handleImageCapture(imageUrl: string) {
    try {
      console.log('Setting new image, size:', imageUrl.length);
      form.setValue("image", imageUrl, { shouldValidate: true });
      setShowCamera(false);
    } catch (error) {
      console.error('Error setting image:', error);
      toast({
        title: "Failed to set image",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }

  const imageValue = form.watch("image");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plant Photo</FormLabel>
              {showCamera ? (
                <div className="space-y-4">
                  <CameraInput onCapture={handleImageCapture} />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCamera(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
                    {imageValue ? (
                      <img
                        src={imageValue}
                        alt="Plant preview"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No image selected
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Gallery
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handleImageCapture(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
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
                <Input placeholder="Additional notes" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 
            (plant ? 'Updating...' : 'Adding...') : 
            (plant ? 'Update Plant' : 'Add Plant')
          }
        </Button>
      </form>
    </Form>
  );
}