import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  InsertTaskChain, TaskChain, TaskTemplate, insertTaskChainSchema,
  InsertChainStep, ChainStep
} from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface ChainBuilderProps {
  open: boolean;
  onClose: () => void;
  existingChain?: TaskChain;
}

interface ChainStepForm extends Omit<InsertChainStep, 'chainId'> {
  templateName?: string;
}

export default function ChainBuilder({ open, onClose, existingChain }: ChainBuilderProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<ChainStepForm[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Fetch task templates from API
  const { data: templates = [], isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ['/api/task-templates'],
  });

  // Fetch chain steps when editing
  const { data: chainSteps = [], isLoading: stepsLoading } = useQuery<ChainStep[]>({
    queryKey: ['/api/task-chains', existingChain?.id, 'steps'],
    enabled: !!existingChain?.id,
  });

  // Initialize form
  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: existingChain || {
      name: "",
      description: "",
      category: "water",
      isActive: true,
    },
  });

  // Initialize steps when editing an existing chain
  useEffect(() => {
    if (existingChain && chainSteps.length > 0) {
      const formattedSteps = chainSteps
        .sort((a, b) => a.order - b.order)
        .map(step => ({
          templateId: step.templateId,
          order: step.order,
          isRequired: step.isRequired ?? true,
          waitDuration: step.waitDuration ?? 0,
          requiresApproval: step.requiresApproval ?? false,
          approvalRoles: step.approvalRoles ?? [],
          templateName: templates.find(t => t.id === step.templateId)?.name,
        }));
      setSteps(formattedSteps);
    } else {
      setSteps([]);
    }
  }, [chainSteps, existingChain, templates]);

  const addStep = () => {
    if (templatesLoading) {
      toast({
        title: "Loading templates",
        description: "Please wait while templates are being loaded.",
        variant: "default",
      });
      return;
    }

    if (!templates || templates.length === 0) {
      toast({
        title: "Cannot add step",
        description: "No task templates are available. Please create a task template first.",
        variant: "destructive",
      });
      return;
    }

    const defaultTemplate = templates[0];
    if (!defaultTemplate) {
      toast({
        title: "Error adding step",
        description: "Could not find a default template to use.",
        variant: "destructive",
      });
      return;
    }

    const newStep: ChainStepForm = {
      templateId: defaultTemplate.id,
      order: steps.length + 1,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: defaultTemplate.requiresExpertise,
      approvalRoles: defaultTemplate.requiresExpertise ? ['expert'] : [],
      templateName: defaultTemplate.name,
    };

    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    setSelectedStep(newSteps.length - 1);
  };

  const updateStep = (index: number, updates: Partial<ChainStepForm>) => {
    if (index < 0 || index >= steps.length) return;
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
    if (selectedStep === index) {
      setSelectedStep(null);
    } else if (selectedStep && selectedStep > index) {
      setSelectedStep(selectedStep - 1);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSteps(items);
    if (selectedStep === result.source.index) {
      setSelectedStep(result.destination.index);
    }
  };

  const onSubmit = (data: InsertTaskChain) => {
    if (steps.length === 0) {
      toast({
        title: "Please add at least one step",
        description: "A chain must contain at least one step",
        variant: "destructive",
      });
      return;
    }
    createChainMutation.mutate(data);
  };

  const createChainMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      if (existingChain) {
        // Update existing chain
        const chainResponse = await fetch(`/api/task-chains/${existingChain.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!chainResponse.ok) {
          throw new Error('Failed to update chain');
        }

        // Delete existing steps
        for (const step of chainSteps) {
          await fetch(`/api/chain-steps/${step.id}`, {
            method: 'DELETE'
          });
        }

        // Create new steps
        for (const [index, step] of steps.entries()) {
          const stepResponse = await fetch('/api/chain-steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...step,
              chainId: existingChain.id,
              order: index + 1,
            })
          });

          if (!stepResponse.ok) {
            throw new Error('Failed to create chain step');
          }
        }

        return chainResponse.json();
      } else {
        // Create new chain
        const chainResponse = await fetch('/api/task-chains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!chainResponse.ok) {
          throw new Error('Failed to create chain');
        }

        const chain = await chainResponse.json();

        // Create steps for the chain
        for (const [index, step] of steps.entries()) {
          const stepResponse = await fetch('/api/chain-steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...step,
              chainId: chain.id,
              order: index + 1,
            })
          });

          if (!stepResponse.ok) {
            throw new Error('Failed to create chain step');
          }
        }

        return chain;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
      toast({
        title: `Chain ${existingChain ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Failed to create/update chain:", error);
      toast({
        title: `Failed to ${existingChain ? "update" : "create"} chain`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedTemplate = selectedStep !== null ? templates.find(t => t.id === steps[selectedStep]?.templateId) : null;

  if (templatesLoading || stepsLoading) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[85vh]">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{existingChain ? 'Edit Task Chain' : 'New Task Chain'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            {/* Chain Information Section */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chain name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Chain name" className="min-h-[40px]" />
                  </FormControl>
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
                    <Input {...field} placeholder="Describe the purpose of this chain" className="min-h-[40px]" />
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
                  <Select
                    value={field.value}
                    onValueChange={(value: InsertTaskChain["category"]) => field.onChange(value)}
                  >
                    <SelectTrigger className="min-h-[40px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="fertilize">Fertilize</SelectItem>
                      <SelectItem value="prune">Prune</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="repot">Repot</SelectItem>
                      <SelectItem value="clean">Clean</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task Configuration Section */}
            {selectedStep !== null && selectedTemplate ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Task: {selectedTemplate.name}</h4>
                    <span className="text-sm text-muted-foreground">({selectedTemplate.estimatedDuration}min)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                </div>

                <Badge variant={selectedTemplate.priority === 'high' ? 'destructive' : 'default'}>
                  {selectedTemplate.priority} priority
                </Badge>

                <FormItem>
                  <FormLabel>Wait Duration (hours)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      value={steps[selectedStep]?.waitDuration || 0}
                      onChange={(e) =>
                        updateStep(selectedStep, {
                          waitDuration: parseInt(e.target.value) || 0,
                        })
                      }
                      className="min-h-[40px]"
                    />
                  </FormControl>
                </FormItem>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`required-${selectedStep}`}
                      checked={steps[selectedStep]?.isRequired}
                      onCheckedChange={(checked) =>
                        updateStep(selectedStep, { isRequired: !!checked })
                      }
                    />
                    <label htmlFor={`required-${selectedStep}`}>Required</label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`approval-${selectedStep}`}
                      checked={steps[selectedStep]?.requiresApproval}
                      onCheckedChange={(checked) =>
                        updateStep(selectedStep, {
                          requiresApproval: !!checked,
                          approvalRoles: checked ? ['expert'] : []
                        })
                      }
                    />
                    <label htmlFor={`approval-${selectedStep}`}>Needs Approval</label>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Chain Steps Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Chain Steps</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  className="h-8"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {steps.length === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground border rounded-lg p-4">
                  <AlertCircle className="w-4 h-4" />
                  <p>Add steps to create a task chain</p>
                </div>
              )}

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {steps.map((step, index) => {
                        const template = templates.find(t => t.id === step.templateId);
                        const isSelected = selectedStep === index;

                        return (
                          <Draggable key={index} draggableId={`step-${index}`} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`border cursor-pointer transition-colors ${isSelected ? 'bg-muted' : ''}`}
                                onClick={() => setSelectedStep(index)}
                              >
                                <CardContent className="p-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="select-none min-w-[24px] h-6 flex items-center justify-center">
                                      {index + 1}
                                    </Badge>

                                    <Select
                                      value={String(step.templateId)}
                                      onValueChange={(value) => {
                                        const template = templates.find(t => t.id === Number(value));
                                        if (template) {
                                          updateStep(index, {
                                            templateId: Number(value),
                                            templateName: template.name,
                                            requiresApproval: template.requiresExpertise,
                                            approvalRoles: template.requiresExpertise ? ['expert'] : []
                                          });
                                          setSelectedStep(index);
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Select task" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {templates.map((template) => (
                                          <SelectItem
                                            key={template.id}
                                            value={String(template.id)}
                                          >
                                            {template.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {template && (
                                      <Badge
                                        variant={template.priority === 'high' ? 'destructive' : 'default'}
                                        className="min-w-[45px] text-center"
                                      >
                                        {template.priority}
                                      </Badge>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeStep(index);
                                      }}
                                      className="h-8 w-8 p-0 ml-auto"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span className="sr-only">Remove step</span>
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-4 bg-background border-t">
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createChainMutation.isPending}
                >
                  {createChainMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}