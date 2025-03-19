import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Plus, Trash2, AlertCircle, GripVertical } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  InsertTaskChain,
  TaskChain,
  TaskTemplate,
  InsertChainStep,
  ChainStep,
  insertTaskChainSchema,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ChainBuilderProps {
  open: boolean;
  onClose: () => void;
  existingChain?: TaskChain;
}

interface ChainStepForm extends Omit<InsertChainStep, "chainId"> {
  templateName?: string;
}

export default function ChainBuilder({ open, onClose, existingChain }: ChainBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<ChainStepForm[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // Load templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  // Load chain steps when editing
  const { data: chainSteps = [], isLoading: stepsLoading } = useQuery<ChainStep[]>({
    queryKey: ["/api/task-chains", existingChain?.id, "steps"],
    enabled: !!existingChain?.id,
  });

  // Initialize form
  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: existingChain ? {
      name: existingChain.name,
      description: existingChain.description ?? "",
      category: existingChain.category,
      isActive: existingChain.isActive ?? true,
    } : {
      name: "",
      description: "",
      category: "water",
      isActive: true,
    },
  });

  // Load steps when editing an existing chain
  useEffect(() => {
    if (existingChain && chainSteps.length > 0 && templates.length > 0) {
      console.log('Loading chain steps:', { chainId: existingChain.id, steps: chainSteps });
      const sortedSteps = chainSteps
        .sort((a, b) => a.order - b.order)
        .map(step => {
          const template = templates.find(t => t.id === step.templateId);
          if (!template) {
            console.warn(`Template not found for step ${step.id}`);
            return null;
          }
          return {
            templateId: step.templateId,
            order: step.order,
            isRequired: step.isRequired ?? true,
            waitDuration: step.waitDuration ?? 0,
            requiresApproval: step.requiresApproval ?? false,
            approvalRoles: step.approvalRoles ?? [],
            templateName: template.name,
          };
        })
        .filter((step): step is NonNullable<typeof step> => step !== null);

      console.log('Setting steps:', sortedSteps);
      setSteps(sortedSteps);
    }
  }, [existingChain, chainSteps, templates]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSteps([]);
      setSelectedStepIndex(null);
    }
  }, [open]);

  const addStep = () => {
    if (!templates.length) {
      toast({
        title: "Cannot add step",
        description: "No task templates available. Please create a task template first.",
        variant: "destructive",
      });
      return;
    }

    const template = templates[0];
    const newStep: ChainStepForm = {
      templateId: template.id,
      order: steps.length + 1,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: template.requiresExpertise,
      approvalRoles: template.requiresExpertise ? ["expert"] : [],
      templateName: template.name,
    };

    setSteps([...steps, newStep]);
    setSelectedStepIndex(steps.length);
  };

  const updateStep = (index: number, updates: Partial<ChainStepForm>) => {
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

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderedSteps = items.map((step, index) => ({
      ...step,
      order: index + 1,
    }));

    setSteps(reorderedSteps);
    if (selectedStepIndex === result.source.index) {
      setSelectedStepIndex(result.destination.index);
    }
  };

  const createChainMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      let chainId: number;

      if (existingChain) {
        // Update existing chain
        const chainResponse = await fetch(`/api/task-chains/${existingChain.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!chainResponse.ok) throw new Error("Failed to update chain");
        const updatedChain = await chainResponse.json();
        chainId = updatedChain.id;

        // Delete existing steps
        await Promise.all(chainSteps.map(step =>
          fetch(`/api/chain-steps/${step.id}`, { method: "DELETE" })
        ));
      } else {
        // Create new chain
        const chainResponse = await fetch("/api/task-chains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!chainResponse.ok) throw new Error("Failed to create chain");
        const newChain = await chainResponse.json();
        chainId = newChain.id;
      }

      // Create steps
      await Promise.all(steps.map((step, index) =>
        fetch("/api/chain-steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...step,
            chainId,
            order: index + 1,
          }),
        })
      ));

      return chainId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
      toast({
        title: `Chain ${existingChain ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Chain mutation error:", error);
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
        description: "A chain must contain at least one step",
        variant: "destructive",
      });
      return;
    }
    createChainMutation.mutate(data);
  };

  if (templatesLoading || stepsLoading) {
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
                      onValueChange={field.onChange}
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
                        {steps.map((step, index) => (
                          <Draggable key={index} draggableId={`step-${index}`} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${selectedStepIndex === index ? "ring-2 ring-primary" : ""}`}
                                onClick={() => setSelectedStepIndex(index)}
                              >
                                <CardContent className="p-3 flex items-center gap-3">
                                  <div {...provided.dragHandleProps} className="cursor-grab">
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
                                          templateName: template.name,
                                          requiresApproval: template.requiresExpertise,
                                          approvalRoles: template.requiresExpertise ? ["expert"] : []
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
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {selectedStepIndex !== null && selectedTemplate && (
              <div className="space-y-4 border rounded-lg p-4">
                <div>
                  <h4 className="font-medium">{selectedTemplate.name}</h4>
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
                            waitDuration: parseInt(e.target.value) || 0
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
                            approvalRoles: checked ? ["expert"] : []
                          })
                        }
                      />
                      <label htmlFor="step-approval">Requires approval</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

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