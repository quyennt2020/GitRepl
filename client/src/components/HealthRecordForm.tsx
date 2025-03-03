import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { InsertHealthRecord, insertHealthRecordSchema, type HealthRecord } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import PlantMoodSelector, { type Mood } from "./PlantMoodSelector";

const COMMON_ISSUES = [
  { value: "yellow_leaves", label: "Yellow Leaves" },
  { value: "brown_spots", label: "Brown Spots" },
  { value: "drooping", label: "Drooping" },
  { value: "pest_damage", label: "Pest Damage" },
  { value: "leaf_drop", label: "Leaf Drop" },
];

interface HealthRecordFormProps {
  plantId: number;
  recordId?: number;
  onSuccess?: () => void;
}

export default function HealthRecordForm({ plantId, recordId, onSuccess }: HealthRecordFormProps) {
  const { toast } = useToast();

  const { data: existingRecord } = useQuery<HealthRecord>({
    queryKey: [`/api/health-records/${recordId}`],
    enabled: !!recordId,
  });

  const form = useForm<InsertHealthRecord>({
    resolver: zodResolver(insertHealthRecordSchema),
    defaultValues: existingRecord ? {
      plantId: existingRecord.plantId,
      healthScore: existingRecord.healthScore,
      mood: existingRecord.mood as Mood,
      issues: existingRecord.issues || [],
      notes: existingRecord.notes || "",
    } : {
      plantId,
      healthScore: 5,
      mood: 'happy' as const,
      issues: [],
      notes: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertHealthRecord) => {
      if (recordId) {
        await apiRequest("PATCH", `/api/health-records/${recordId}`, data);
      } else {
        await apiRequest("POST", `/api/plants/${plantId}/health`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plants/${plantId}/health`] });
      if (recordId) {
        queryClient.invalidateQueries({ queryKey: [`/api/health-records/${recordId}`] });
      }
      toast({ title: `Health record ${recordId ? 'updated' : 'added'} successfully` });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: `Failed to ${recordId ? 'update' : 'add'} health record`,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="mood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plant Mood</FormLabel>
              <FormControl>
                <PlantMoodSelector 
                  value={field.value} 
                  onChange={(value) => field.onChange(value)} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="healthScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Health Score (1-5)</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select health score" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <SelectItem key={score} value={score.toString()}>
                      {score} - {score === 1 ? "Poor" : score === 5 ? "Excellent" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="issues"
          render={() => (
            <FormItem>
              <FormLabel>Issues</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_ISSUES.map((issue) => (
                  <FormField
                    key={issue.value}
                    control={form.control}
                    name="issues"
                    render={({ field }) => {
                      const issues = field.value || [];
                      return (
                        <FormItem key={issue.value} className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={issues.includes(issue.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...issues, issue.value]);
                                } else {
                                  field.onChange(issues.filter((value) => value !== issue.value));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">{issue.label}</FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
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
                <Input 
                  placeholder="Additional observations"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? `${recordId ? 'Updating' : 'Adding'}...` : recordId ? 'Update Record' : 'Add Record'}
        </Button>
      </form>
    </Form>
  );
}