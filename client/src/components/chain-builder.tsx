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
import { Plus, Trash2, AlertCircle, GripVertical } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ChainBuilderProps {
  open: boolean;
  onClose: () => void;
  existingChain?: TaskChain;
}

interface ChainStepForm {
  templateId: number;
  order: number;
  isRequired: boolean;
  waitDuration: number;
  requiresApproval: boolean;
  approvalRoles: string[];
}

export default function ChainBuilder({ open, onClose, existingChain }: ChainBuilderProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<ChainStepForm[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // Fetch task templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ['/api/task-templates'],
  });

  // Initialize form
  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: {
      name: existingChain?.name || "",
      description: existingChain?.description || "",
      category: existingChain?.category || "water",
      isActive: existingChain?.isActive ?? true,
    },
  });

  // Step Management Functions
  const addStep = () => {
    if (!templates.length) {
      toast({
        title: "Cannot add step",
        description: "No task templates available. Please create a task template first.",
        variant: "destructive",
      });
      return;
    }

    const newStep: ChainStepForm = {
      templateId: templates[0].id,
      order: steps.length + 1,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: templates[0].requiresExpertise,
      approvalRoles: templates[0].requiresExpertise ? ['expert'] : [],
    };

    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    setSelectedStepIndex(newSteps.length - 1);
  };

  const updateStep = (index: number, updates: Partial<ChainStepForm>) => {
    if (index < 0 || index >= steps.length) return;
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
    setSelectedStepIndex(null);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newSteps = Array.from(steps);
    const [reorderedItem] = newSteps.splice(result.source.index, 1);
    newSteps.splice(result.destination.index, 0, reorderedItem);

    setSteps(newSteps);
    if (selectedStepIndex === result.source.index) {
      setSelectedStepIndex(result.destination.index);
    }
  };

  // Save Chain
  const createChainMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      if (existingChain) {
        // Update existing chain
        const chainResponse = await fetch(`/api/task-chains/${existingChain.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!chainResponse.ok) throw new Error('Failed to update chain');
        const updatedChain = await chainResponse.json();

        // Delete existing steps
        await fetch(`/api/task-chains/${existingChain.id}/steps`, {
          method: 'DELETE'
        });

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

        return updatedChain;
      } else {
        // Create new chain
        const chainResponse = await fetch('/api/task-chains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!chainResponse.ok) throw new Error('Failed to create chain');
        const newChain = await chainResponse.json();

        // Create steps for the chain
        for (const [index, step] of steps.entries()) {
          const stepResponse = await fetch('/api/chain-steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...step,
              chainId: newChain.id,
              order: index + 1,
            })
          });

          if (!stepResponse.ok) {
            throw new Error('Failed to create chain step');
          }
        }

        return newChain;
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
      toast({
        title: `Failed to ${existingChain ? "update" : "create"} chain`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTaskChain) => {
    if (steps.length === 0) {
      toast({
        title: "Please add at least one step",
        description: "A task chain must contain at least one step",
        variant: "destructive",
      });
      return;
    }
    createChainMutation.mutate(data);
  };

  if (templatesLoading) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedTemplate = selectedStepIndex !== null ? 
    templates.find(t => t.id === steps[selectedStepIndex]?.templateId) : null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingChain ? "Edit Task Chain" : "New Task Chain"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Chain Details */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chain name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter chain name" />
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
                      <Input {...field} placeholder="Describe the chain's purpose" />
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
                      <SelectTrigger>
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
            </div>

            {/* Steps Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Chain Steps</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {steps.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground border rounded-lg p-4">
                  <AlertCircle className="w-4 h-4" />
                  <p>Add steps to create a task chain</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="steps">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {steps.map((step, index) => {
                          const template = templates.find(t => t.id === step.templateId);
                          const isSelected = selectedStepIndex === index;

                          return (
                            <Draggable key={index} draggableId={`step-${index}`} index={index}>
                              {(provided) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`${isSelected ? 'ring-2 ring-primary' : ''}`}
                                  onClick={() => setSelectedStepIndex(index)}
                                >
                                  <CardContent className="p-3 flex items-center gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab"
                                    >
                                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                                    </div>

                                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center">
                                      {index + 1}
                                    </Badge>

                                    <Select
                                      value={String(step.templateId)}
                                      onValueChange={(value) => {
                                        const template = templates.find(t => t.id === Number(value));
                                        if (template) {
                                          updateStep(index, {
                                            templateId: Number(value),
                                            requiresApproval: template.requiresExpertise,
                                            approvalRoles: template.requiresExpertise ? ['expert'] : []
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select task" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {templates.map((t) => (
                                          <SelectItem key={t.id} value={String(t.id)}>
                                            {t.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeStep(index);
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span className="sr-only">Remove step</span>
                                    </Button>
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
              )}
            </div>

            {/* Step Configuration */}
            {selectedStepIndex !== null && selectedTemplate && (
              <div className="space-y-4 border rounded-lg p-4">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    {selectedTemplate.name}
                    <span className="text-sm text-muted-foreground">
                      ({selectedTemplate.estimatedDuration}min)
                    </span>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description}
                  </p>
                </div>

                <div className="space-y-4">
                  <FormItem>
                    <FormLabel>Wait Duration (hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        value={steps[selectedStepIndex].waitDuration}
                        onChange={(e) =>
                          updateStep(selectedStepIndex, {
                            waitDuration: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </FormControl>
                  </FormItem>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="step-required"
                        checked={steps[selectedStepIndex].isRequired}
                        onCheckedChange={(checked) =>
                          updateStep(selectedStepIndex, {
                            isRequired: !!checked
                          })
                        }
                      />
                      <label htmlFor="step-required">Required step</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="step-approval"
                        checked={steps[selectedStepIndex].requiresApproval}
                        onCheckedChange={(checked) =>
                          updateStep(selectedStepIndex, {
                            requiresApproval: !!checked,
                            approvalRoles: checked ? ['expert'] : []
                          })
                        }
                      />
                      <label htmlFor="step-approval">Requires approval</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-background border-t">
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
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