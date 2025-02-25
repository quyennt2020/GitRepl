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
import { Plus, Info, Edit2, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as z from "zod";
import {AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction} from "@/components/ui/alert-dialog";

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
        <Button onClick={() => {
          setEditingTemplate(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {uniqueTemplates?.map((template) => (
        <Card key={template.id} className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium">{template.name}</h3>
              {(allChecklistItems?.[template.id] || []).map((item) => (
                <div key={item.id} className="flex items-center gap-2 mt-2">
                  <Input type="text" value={item.description} readOnly />
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}

      {uniqueTemplates?.map((template) => (
        <Card key={template.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="font-medium">{template.name}</h3>
              <p className="text-sm text-muted-foreground">{template.description}</p>
              {allChecklistItems?.[template.id]?.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="h-4 w-4 border rounded" />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => {
                setEditingTemplate(template);
                setIsDialogOpen(true);
              }}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Task Template" : "New Task Template"}</DialogTitle>
          </DialogHeader>
          <CreateTemplateForm editingTemplate={editingTemplate} allChecklistItems={allChecklistItems} onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CreateTemplateFormProps {
  template: TaskTemplate | null;
  allChecklistItems: Record<number, ChecklistItem[]>;
  onSuccess: () => void;
}

function CreateTemplateForm({ editingTemplate, onSuccess, allChecklistItems }: CreateTemplateFormProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertTaskTemplateSchema),
    defaultValues: editingTemplate || {
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
      if (editingTemplate) {
        await apiRequest("PUT", `/api/task-templates/${editingTemplate.id}`, data);
      } else {
        await apiRequest("POST", "/api/task-templates", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({ title: editingTemplate ? "Template updated successfully" : "Template created successfully" });
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: editingTemplate ? "Failed to update template" : "Failed to create template",
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

        {editingTemplate?.id && (
            <ChecklistItemsConfig templateId={editingTemplate.id} />
        )}
        const handleAddItem = async () => {
          await apiRequest("POST", "/api/checklist-items", {
            templateId: editingTemplate.id,
            text: "New item",
            order: allChecklistItems?.[editingTemplate.id]?.length || 0,
          });
              queryClient.invalidateQueries({ queryKey: ["/api/task-templates/checklist-items"] });
              toast({ title: "Checklist item added" });
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Checklist Item
          </Button>
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
          {editingTemplate ? "Update Template" : "Create Template"}
        </Button>
      </form>
    </Form>
  );
}