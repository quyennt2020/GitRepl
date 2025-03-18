
import { useMutation } from "@tanstack/react-query";
import { TaskTemplate, insertTaskTemplateSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import * as React from 'react';

interface TaskTemplateFormProps {
  editingTemplate: TaskTemplate | null;
  onSuccess?: () => void;
}

export default function TaskTemplateForm({ editingTemplate, onSuccess }: TaskTemplateFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof insertTaskTemplateSchema>>({
    resolver: zodResolver(insertTaskTemplateSchema),
    defaultValues: {
      name: editingTemplate?.name ?? "",
      category: editingTemplate?.category ?? "water",
      description: editingTemplate?.description ?? "",
      priority: editingTemplate?.priority ?? "medium",
      defaultInterval: editingTemplate?.defaultInterval ?? 7,
      isOneTime: editingTemplate?.isOneTime ?? false,
      public: editingTemplate?.public ?? false,
      applyToAll: editingTemplate?.applyToAll ?? false,
    },
    mode: "onChange"
  });

  const isOneTime = form.watch("isOneTime", false);
  const isPublic = form.watch("public", false);

  // Handle defaultInterval and isOneTime relationship
  React.useEffect(() => {
    if (isOneTime) {
      form.setValue("defaultInterval", 0, { shouldValidate: true });
    } else if (!form.getValues("defaultInterval")) {
      form.setValue("defaultInterval", 7, { shouldValidate: true });
    }
  }, [isOneTime, form]);

  // Handle public and applyToAll relationship
  React.useEffect(() => {
    if (!isPublic) {
      form.setValue("applyToAll", false, { shouldValidate: true });
    }
  }, [isPublic, form]);

  const { mutate: saveTemplate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof insertTaskTemplateSchema>) => {
      const response = await fetch(
        editingTemplate?.id 
          ? `/api/task-templates/${editingTemplate.id}` 
          : "/api/task-templates",
        {
          method: editingTemplate?.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to save template');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `Template ${editingTemplate ? "updated" : "created"} successfully`,
        description: "All changes have been saved to the database"
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: `Failed to ${editingTemplate ? "update" : "create"} template`,
        variant: "destructive",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => saveTemplate(data))} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Task template name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["water", "fertilize", "prune", "check", "repot", "clean"].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Template description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["low", "medium", "high"].map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
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
          name="isOneTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Type</FormLabel>
              <div className="flex items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <span className="text-sm">One-time task</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isOneTime && (
          <FormField
            control={form.control}
            name="defaultInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Interval (days)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min={1}
                    placeholder="Days between tasks"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-medium">Template Settings</h3>

          <FormField
            control={form.control}
            name="public"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="!mt-0">Public Template</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Make this template available for assigning tasks to plants
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="applyToAll"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    disabled={!isPublic}
                    checked={field.value && isPublic}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="!mt-0">Apply to All Plants</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Make template public first to enable this option
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {editingTemplate ? "Update" : "Create"} Template
        </Button>
      </form>
    </Form>
  );
}
