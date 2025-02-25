import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskTemplate, ChecklistItem, insertTaskTemplateSchema } from "@shared/schema";
import ChecklistItemsConfig from "./ChecklistItemsConfig";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Info, Edit2, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as z from 'zod';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface CreateTemplateFormProps {
  editingTemplate: TaskTemplate | null;
  allChecklistItems: Record<number, ChecklistItem[]>;
  onSuccess?: () => void;
}

export default function TaskTemplateConfig() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { data: allChecklistItems = {}, isLoading: checklistLoading } = useQuery<Record<number, ChecklistItem[]>>({
    queryKey: ["/api/task-templates/checklist-items"],
    enabled: !!templates,
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

  const { mutate: deleteTemplate } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/task-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({ title: "Template deleted successfully" });
    },
  });

  if (isLoading || checklistLoading) {
    return <div>Loading...</div>;
  }

  const uniqueTemplates = [...new Set(templates?.map(t => t.name))];
  const sortedTemplates = templates?.filter(template => uniqueTemplates.includes(template.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Task Templates</h2>
        <Button onClick={() => {
          setEditingTemplate(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedTemplates?.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{template.category}</Badge>
                  <Badge variant="outline">{template.priority} priority</Badge>
                  <Badge variant="outline">{template.defaultInterval} days interval</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Apply to all plants</span>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>When enabled, this task template will be automatically available for all plants in your collection.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Switch
                  checked={template.applyToAll}
                  onCheckedChange={(checked) => {
                    updateTemplate({ id: template.id, applyToAll: checked });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Template</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this template? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTemplate(template.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplate(null);
          }
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Task Template" : "New Task Template"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <CreateTemplateForm 
              editingTemplate={editingTemplate} 
              allChecklistItems={allChecklistItems} 
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingTemplate(null);
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateTemplateForm({ editingTemplate, onSuccess, allChecklistItems }: CreateTemplateFormProps) {
  const { toast } = useToast();
  const [localItems, setLocalItems] = useState<Array<{text: string, required: boolean, order: number}>>([]);

  // Reset local items when editing template changes
  useEffect(() => {
    if (editingTemplate?.id && allChecklistItems[editingTemplate.id]) {
      const items = allChecklistItems[editingTemplate.id];
      setLocalItems(items.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
    } else {
      setLocalItems([]);
    }
  }, [editingTemplate, allChecklistItems]);

  const form = useForm<z.infer<typeof insertTaskTemplateSchema>>({
    resolver: zodResolver(insertTaskTemplateSchema),
    defaultValues: {
      name: editingTemplate?.name ?? "",
      category: editingTemplate?.category ?? "water",
      description: editingTemplate?.description ?? "",
      priority: editingTemplate?.priority ?? "medium",
      defaultInterval: editingTemplate?.defaultInterval ?? 7,
      applyToAll: editingTemplate?.applyToAll ?? false,
      estimatedDuration: editingTemplate?.estimatedDuration ?? 15,
      requiresExpertise: editingTemplate?.requiresExpertise ?? false,
    },
  });

  // Reset form when editing template changes
  useEffect(() => {
    if (editingTemplate) {
      form.reset({
        name: editingTemplate.name,
        category: editingTemplate.category,
        description: editingTemplate.description,
        priority: editingTemplate.priority,
        defaultInterval: editingTemplate.defaultInterval,
        applyToAll: editingTemplate.applyToAll,
        estimatedDuration: editingTemplate.estimatedDuration,
        requiresExpertise: editingTemplate.requiresExpertise,
      });
    } else {
      form.reset({
        name: "",
        category: "water",
        description: "",
        priority: "medium",
        defaultInterval: 7,
        applyToAll: false,
        estimatedDuration: 15,
        requiresExpertise: false,
      });
    }
  }, [editingTemplate, form]);

  const { mutate: saveTemplate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof insertTaskTemplateSchema>) => {
      let templateId: number;

      if (editingTemplate?.id) {
        // Update existing template
        await apiRequest("PATCH", `/api/task-templates/${editingTemplate.id}`, data);
        templateId = editingTemplate.id;

        // Get current checklist items
        const currentItems = allChecklistItems?.[editingTemplate.id] || [];

        // Delete existing checklist items
        await Promise.all(currentItems.map(item => 
          apiRequest("DELETE", `/api/checklist-items/${item.id}`)
        ));
      } else {
        // Create new template
        const response = await apiRequest("POST", "/api/task-templates", data);
        const newTemplate = await response.json();
        templateId = newTemplate.id;
      }

      // Add all checklist items
      if (localItems.length > 0) {
        await Promise.all(localItems.map((item, index) => 
          apiRequest("POST", "/api/checklist-items", {
            templateId,
            text: item.text,
            required: item.required,
            order: index
          })
        ));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates/checklist-items"] });
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
      <form onSubmit={form.handleSubmit((data) => saveTemplate(data))} className="space-y-4">
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
                <Textarea {...field} placeholder="Template description" value={field.value || ""} />
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
                  <Input 
                    type="number" 
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <ChecklistItemsConfig 
          templateId={editingTemplate?.id ?? -1} 
          setLocalItems={setLocalItems} 
        />

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

        <Button type="submit" className="w-full" disabled={isPending}>
          {editingTemplate ? "Update Template" : "Create Template"}
        </Button>
      </form>
    </Form>
  );
}