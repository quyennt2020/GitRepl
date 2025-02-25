import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskTemplate, insertCareTaskSchema, type InsertCareTask } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, CalendarIcon, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TaskFormProps {
  plantId: number;
}

export default function TaskForm({ plantId }: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  const form = useForm<InsertCareTask>({
    resolver: zodResolver(insertCareTaskSchema),
    defaultValues: {
      plantId,
      completed: false,
      checklistProgress: {},
      notes: "",
    },
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { mutate: createTask, isPending } = useMutation({
    mutationFn: async (data: InsertCareTask) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const applyToAll = selectedTemplate?.applyToAll;
      toast({ 
        title: "Task created successfully", 
        description: applyToAll ? "Task has been created for all plants" : undefined
      });
      setOpen(false);
      form.reset();
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast({
        title: error instanceof Error ? error.message : "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleTemplateChange = (templateId: string) => {
    const template = templates?.find(t => t.id === parseInt(templateId));
    setSelectedTemplate(template || null);
    form.setValue("templateId", parseInt(templateId));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Create New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createTask(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Task Type</FormLabel>
                    {selectedTemplate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {selectedTemplate.applyToAll 
                              ? "This task will be created for all plants" 
                              : "This task will only be created for the selected plant"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Select
                    onValueChange={handleTemplateChange}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
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
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                    <Textarea
                      placeholder="Add any additional notes or instructions..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              Create Task
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}