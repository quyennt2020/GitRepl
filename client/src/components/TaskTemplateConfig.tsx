import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskTemplate, ChecklistItem, insertTaskTemplateSchema, insertChecklistItemSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, MoveVertical } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

export default function TaskTemplateConfig() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { mutate: updateTemplate } = useMutation({
    mutationFn: async ({ id, applyToAll }: { id: number; applyToAll: boolean }) => {
      await apiRequest("PATCH", `/api/task-templates/${id}`, { applyToAll });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({ title: "Template updated successfully" });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const uniqueTemplates = templates?.reduce((acc: TaskTemplate[], curr) => {
    if (!acc.find(t => t.name === curr.name)) {
      acc.push(curr);
    }
    return acc;
  }, []).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Task Templates</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {uniqueTemplates?.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <div className="flex gap-2 mt-1">
                  <Badge>{template.category}</Badge>
                  <Badge variant={template.priority === "high" ? "destructive" : template.priority === "medium" ? "default" : "secondary"}>
                    {template.priority} priority
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Apply to all plants</span>
                  <Switch
                    checked={template.applyToAll}
                    onCheckedChange={(checked) => {
                      updateTemplate({ id: template.id, applyToAll: checked });
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task Template</DialogTitle>
          </DialogHeader>
          <CreateTemplateForm onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateTemplateForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(insertTaskTemplateSchema),
    defaultValues: {
      name: "",
      category: "water",
      description: "",
      priority: "medium",
      applyToAll: false,
      defaultInterval: 7,
      estimatedDuration: 15,
      requiresExpertise: false,
    },
  });

  const { mutate: createTemplate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof insertTaskTemplateSchema>) => {
      await apiRequest("POST", "/api/task-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({ title: "Template created successfully" });
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create template",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createTemplate(data))} className="space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
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
            name="defaultInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Interval (days)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <FormField
            control={form.control}
            name="applyToAll"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Apply to all plants</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          Create Template
        </Button>
      </form>
    </Form>
  );
}
