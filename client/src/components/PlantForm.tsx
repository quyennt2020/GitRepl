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
import { useState, useRef } from "react";
import { Camera, Upload } from "lucide-react";

interface PlantFormProps {
  plant?: Plant;
}

export default function PlantForm({ plant }: PlantFormProps) {
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        form.setValue("image", imageUrl);
      };
      reader.readAsDataURL(file);
    }
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
              <div className="space-y-2">
                {showCamera ? (
                  <CameraInput onCapture={handleImageCapture} />
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </div>
                )}
                {field.value && (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                    <img 
                      src={field.value} 
                      alt="Selected plant"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>
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