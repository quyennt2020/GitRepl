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
import ImageInput from "./ImageInput";

interface PlantFormProps {
  plant?: Plant;
}

export default function PlantForm({ plant }: PlantFormProps) {
  const { toast } = useToast();

  const form = useForm<InsertPlant>({
    resolver: zodResolver(insertPlantSchema),
    defaultValues: plant ? {
      name: plant.name,
      species: plant.species,
      location: plant.location ?? "",
      image: plant.image,
      wateringInterval: plant.wateringInterval,
      fertilizingInterval: plant.fertilizingInterval,
      sunlight: plant.sunlight,
      notes: plant.notes ?? "",
      position: plant.position ?? ""
    } : {
      name: "",
      species: "",
      location: "",
      image: "https://placehold.co/400x400?text=Plant",
      wateringInterval: 7,
      fertilizingInterval: 30,
      sunlight: "medium",
      notes: "",
      position: ""
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
    },
    onError: (error) => {
      console.error("Error adding/updating plant:", error);
      toast({ 
        title: `Failed to ${plant ? 'update' : 'add'} plant`,
        variant: "destructive"
      });
    }
  });

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
          name="wateringInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Watering Interval (days)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Days between watering"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
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
                  placeholder="Days between fertilizing"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
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
              <FormControl>
                <ImageInput
                  defaultImage={field.value}
                  onImageSelect={(imageUrl) => field.onChange(imageUrl)}
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
              <Select onValueChange={field.onChange} value={field.value}>
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