import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertHealthRecord, insertHealthRecordSchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const COMMON_ISSUES = [
  { value: "yellow_leaves", label: "Yellow Leaves" },
  { value: "brown_spots", label: "Brown Spots" },
  { value: "drooping", label: "Drooping" },
  { value: "pest_damage", label: "Pest Damage" },
  { value: "leaf_drop", label: "Leaf Drop" },
];

interface HealthRecordFormProps {
  plantId: number;
  onSuccess?: () => void;
}

export default function HealthRecordForm({ plantId, onSuccess }: HealthRecordFormProps) {
  const { toast } = useToast();

  const form = useForm<InsertHealthRecord>({
    resolver: zodResolver(insertHealthRecordSchema),
    defaultValues: {
      plantId,
      healthScore: 5,
      issues: [],
      notes: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertHealthRecord) => {
      await apiRequest("POST", `/api/plants/${plantId}/health`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plants/${plantId}/health`] });
      toast({ title: "Health record added successfully" });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Failed to add health record",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-4">
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
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(issue.value)}
                            onCheckedChange={(checked) => {
                              const issues = field.value || [];
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
                    )}
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
                <Input placeholder="Additional observations" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Adding..." : "Add Health Record"}
        </Button>
      </form>
    </Form>
  );
}
