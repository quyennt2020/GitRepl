import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  TaskChain,
  TaskTemplate,
  ChainStep,
  InsertTaskChain,
  insertTaskChainSchema,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { Plus, Trash2, AlertCircle, GripVertical, Clock, Shield } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";


interface Props {
  open: boolean;
  onClose: () => void;
  existingChain?: TaskChain;
}

interface StepData {
  id?: number;
  chainId?: number;
  templateId: number;
  order: number;
  isRequired: boolean;
  waitDuration: number;
  requiresApproval: boolean;
  approvalRoles: string[];
}

export default function ChainBuilder({ open, onClose, existingChain }: Props) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<StepData[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Load templates
  const templatesQuery = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  // Load chain steps if editing with proper cache invalidation
  const stepsQuery = useQuery<ChainStep[]>({
    queryKey: ["/api/task-chains", existingChain?.id, "steps"],
    enabled: !!existingChain?.id,
  });

  // Initialize steps from existing chain
  useEffect(() => {
    if (existingChain && stepsQuery.data?.length && templatesQuery.data?.length) {
      const sortedSteps = stepsQuery.data
        .sort((a, b) => a.order - b.order)
        .map(step => {
          const template = templatesQuery.data.find(t => t.id === step.templateId);
          return {
            id: step.id,
            templateId: step.templateId,
            order: step.order,
            isRequired: step.isRequired ?? true,
            waitDuration: step.waitDuration ?? 0,
            requiresApproval: step.requiresApproval ?? false,
            approvalRoles: step.approvalRoles ?? [],
          };
        });
      setSteps(sortedSteps);
    }
  }, [existingChain, stepsQuery.data, templatesQuery.data]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSteps([]);
      setSelectedStep(null);
    }
  }, [open]);

  // Form setup
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

  // Save chain mutation
  const saveMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      // Save the chain first
      const chainResponse = await fetch(
        existingChain ? `/api/task-chains/${existingChain.id}` : "/api/task-chains",
        {
          method: existingChain ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!chainResponse.ok) {
        throw new Error("Failed to save chain");
      }

      const chain = await chainResponse.json();

      // If updating, delete old steps
      if (existingChain) {
        await Promise.all(
          stepsQuery.data?.map(step =>
            fetch(`/api/chain-steps/${step.id}`, { method: "DELETE" })
          ) || []
        );
      }

      // Create new steps
      await Promise.all(
        steps.map((step, index) =>
          fetch("/api/chain-steps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...step,
              chainId: chain.id,
              order: index + 1,
            }),
          })
        )
      );

      return chain;
    },
    onSuccess: (chain) => {
      // Invalidate both chains and steps queries
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/task-chains", chain.id, "steps"]
      });

      toast({
        title: `Chain ${existingChain ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error saving chain",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const addStep = () => {
    const templates = templatesQuery.data;
    if (!templates?.length) {
      toast({
        title: "Cannot add step",
        description: "No task templates available. Please create a task template first.",
        variant: "destructive",
      });
      return;
    }

    const template = templates[0];
    const newStep: StepData = {
      templateId: template.id,
      order: steps.length + 1,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: template.requiresExpertise,
      approvalRoles: template.requiresExpertise ? ["expert"] : [],
    };

    setSteps([...steps, newStep]);
    setSelectedStep(steps.length);
  };

  const updateStep = (index: number, updates: Partial<StepData>) => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...updates } : step)));
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
    setSelectedStep(null);
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
    if (selectedStep === result.source.index) {
      setSelectedStep(result.destination.index);
    }
  };

  const onSubmit = (data: InsertTaskChain) => {
    if (steps.length === 0) {
      toast({
        title: "Please add at least one step",
        description: "A task chain must contain at least one step",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(data);
  };


  // Loading state
  if (templatesQuery.isLoading || stepsQuery.isLoading) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedTemplate =
    selectedStep !== null && templatesQuery.data
      ? templatesQuery.data.find((t) => t.id === steps[selectedStep]?.templateId)
      : null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingChain ? "Edit Task Chain" : "New Task Chain"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chain name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter a descriptive name for this chain" />
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
                      <Textarea 
                        {...field} 
                        placeholder="Describe the purpose and goals of this task chain"
                        className="resize-none"
                        rows={3}
                      />
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
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

            {/* Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Chain Steps</h3>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
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
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {steps.map((step, index) => {
                          const template = templatesQuery.data?.find(
                            (t) => t.id === step.templateId
                          );

                          return (
                            <Draggable
                              key={index}
                              draggableId={`step-${index}`}
                              index={index}
                            >
                              {(provided) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`${
                                    selectedStep === index ? "ring-2 ring-primary" : ""
                                  }`}
                                  onClick={() => setSelectedStep(index)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-1 cursor-grab"
                                      >
                                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                                      </div>

                                      <div className="min-w-[32px] h-8 flex items-center justify-center border rounded-md bg-muted">
                                        {index + 1}
                                      </div>

                                      <div className="flex-1 space-y-2">
                                        <Select
                                          value={String(step.templateId)}
                                          onValueChange={(value) => {
                                            const template = templatesQuery.data?.find(
                                              (t) => t.id === Number(value)
                                            );
                                            if (template) {
                                              updateStep(index, {
                                                templateId: Number(value),
                                                requiresApproval: template.requiresExpertise,
                                                approvalRoles: template.requiresExpertise ? ["expert"] : [],
                                              });
                                            }
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a task template" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {templatesQuery.data?.map((t) => (
                                              <SelectItem key={t.id} value={String(t.id)}>
                                                {t.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        {template && (
                                          <div className="text-sm text-muted-foreground">
                                            {template.description}
                                          </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 text-sm">
                                          {step.waitDuration > 0 && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              Wait {step.waitDuration}h
                                            </Badge>
                                          )}
                                          {step.requiresApproval && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                              <Shield className="w-3 h-3" />
                                              Needs Approval
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

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
              )}
            </div>

            {/* Step Configuration */}
            {selectedStep !== null && templatesQuery.data && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="space-y-1">
                  <h4 className="font-medium">Step Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure additional settings for this step
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <FormItem>
                    <FormLabel>Wait Duration (hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        value={steps[selectedStep].waitDuration}
                        onChange={(e) =>
                          updateStep(selectedStep, {
                            waitDuration: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Hours to wait after previous step"
                      />
                    </FormControl>
                  </FormItem>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="step-required"
                        checked={steps[selectedStep].isRequired}
                        onCheckedChange={(checked) =>
                          updateStep(selectedStep, {
                            isRequired: !!checked,
                          })
                        }
                      />
                      <label htmlFor="step-required" className="text-sm font-medium leading-none">
                        Required step
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="step-approval"
                        checked={steps[selectedStep].requiresApproval}
                        onCheckedChange={(checked) =>
                          updateStep(selectedStep, {
                            requiresApproval: !!checked,
                            approvalRoles: checked ? ["expert"] : [],
                          })
                        }
                      />
                      <label htmlFor="step-approval" className="text-sm font-medium leading-none">
                        Requires approval
                      </label>
                    </div>

                    {steps[selectedStep].requiresApproval && (
                      <FormItem className="space-y-1">
                        <FormLabel>Approval Roles</FormLabel>
                        <Select
                          value={steps[selectedStep].approvalRoles[0] || "expert"}
                          onValueChange={(value) =>
                            updateStep(selectedStep, {
                              approvalRoles: [value],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select required role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expert">Expert</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-background border-t">
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}