import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TaskChain, TaskTemplate, InsertTaskChain, insertTaskChainSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Trash2, AlertCircle, Clock, Shield } from "lucide-react";

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
  templateName: string;
  templateDescription: string | null;
}

export default function ChainBuilder({ open, onClose, existingChain }: Props) {
  const { toast } = useToast();
  const [localSteps, setLocalSteps] = useState<StepData[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);

  // Load templates for step selection
  const { data: templates = [] } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  // Form setup with proper initialization
  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: {
      name: existingChain?.name ?? "",
      description: existingChain?.description ?? "",
      category: (existingChain?.category ?? "water") as "water" | "fertilize" | "prune" | "check" | "repot" | "clean",
      isActive: existingChain?.isActive ?? true,
    },
  });

  // Save mutation with improved error handling
  const saveMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      if (localSteps.length === 0) {
        throw new Error("At least one step is required");
      }

      setIsLoading(true);
      try {
        console.log('Saving chain:', {
          data,
          existingChain: existingChain?.id,
          stepsCount: localSteps.length
        });

        // Save chain first
        const chainResponse = await fetch(
          existingChain ? `/api/task-chains/${existingChain.id}` : "/api/task-chains",
          {
            method: existingChain ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );

        if (!chainResponse.ok) {
          const error = await chainResponse.text();
          throw new Error(`Failed to save chain: ${error}`);
        }

        const chain = await chainResponse.json();
        console.log('Chain saved:', chain);

        // Create new steps with correct chain ID
        const stepPromises = localSteps.map((step, index) =>
          fetch("/api/chain-steps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...step,
              chainId: chain.id,
              order: index + 1,
            }),
          }).then(async (response) => {
            if (!response.ok) {
              const error = await response.text();
              throw new Error(`Failed to save step ${index + 1}: ${error}`);
            }
            return response.json();
          })
        );

        await Promise.all(stepPromises);
        console.log('All steps saved successfully');

        return chain;
      } catch (error) {
        console.error('Error saving chain:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
      toast({
        title: `Chain template ${existingChain ? "updated" : "created"} successfully`,
      });
      cleanup();
    },
    onError: (error) => {
      toast({
        title: "Error saving chain template",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Load existing chain steps when editing
  const { data: existingSteps = [] } = useQuery<StepData[]>({
    queryKey: ["/api/task-chains", existingChain?.id, "steps"],
    enabled: !!existingChain?.id,
  });

  // Initialize local state from existing data
  useEffect(() => {
    if (existingSteps.length && existingChain) {
      setLocalSteps(existingSteps.map(step => ({
        id: step.id,
        chainId: existingChain.id,
        templateId: step.templateId,
        order: step.order,
        isRequired: step.isRequired ?? true,
        waitDuration: step.waitDuration ?? 0,
        requiresApproval: step.requiresApproval ?? false,
        approvalRoles: step.approvalRoles ?? [],
        templateName: step.templateName,
        templateDescription: step.templateDescription,
      })));
      setIsDirty(false);
    }
  }, [existingChain, existingSteps]);

  // Reset form when existingChain changes
  useEffect(() => {
    if (existingChain) {
      form.reset({
        name: existingChain.name,
        description: existingChain.description ?? "",
        category: existingChain.category as "water" | "fertilize" | "prune" | "check" | "repot" | "clean",
        isActive: existingChain.isActive,
      });
      setIsDirty(false);
    }
  }, [existingChain, form]);

  // Watch form values for changes
  useEffect(() => {
    const subscription = form.watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Handle dialog close with unsaved changes
  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedChanges(true);
    } else {
      cleanup();
    }
  };

  // Cleanup function
  const cleanup = () => {
    setLocalSteps([]);
    setSelectedStep(null);
    setIsDirty(false);
    setShowUnsavedChanges(false);
    form.reset();
    onClose();
  };


  // Step management
  const addStep = () => {
    if (!templates.length) {
      toast({
        title: "Cannot add step",
        description: "No task templates available",
        variant: "destructive",
      });
      return;
    }

    const template = templates[0];
    const newStep: StepData = {
      templateId: template.id,
      order: localSteps.length + 1,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: template.requiresExpertise ?? false,
      approvalRoles: template.requiresExpertise ? ["expert"] : [],
      templateName: template.name,
      templateDescription: template.description ?? null,
    };

    setLocalSteps([...localSteps, newStep]);
    setSelectedStep(localSteps.length);
    setIsDirty(true);
  };

  const updateStep = (index: number, updates: Partial<StepData>) => {
    if (updates.templateId !== undefined && templates) {
      const template = templates.find(t => t.id === updates.templateId);
      if (template) {
        updates.templateName = template.name;
        updates.templateDescription = template.description ?? null;
      }
    }
    setLocalSteps(localSteps.map((step, i) => i === index ? { ...step, ...updates } : step));
    setIsDirty(true);
  };

  const removeStep = (index: number) => {
    setLocalSteps(localSteps.filter((_, i) => i !== index));
    setSelectedStep(null);
    setIsDirty(true);
  };

  const selectedStepData = selectedStep !== null ? localSteps[selectedStep] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {existingChain ? "Edit Task Chain" : "New Task Chain"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
              {/* Chain Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
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
                        <Textarea
                          {...field}
                          placeholder="Describe the chain's purpose"
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

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Chain Steps</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                {localSteps.length === 0 ? (
                  <div className="flex items-center gap-2 text-muted-foreground border rounded-lg p-4">
                    <AlertCircle className="w-4 h-4" />
                    <p>Add steps to create a task chain</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localSteps.map((step, index) => (
                      <Card
                        key={index}
                        className={`${selectedStep === index ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedStep(index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="min-w-[32px] h-8 flex items-center justify-center border rounded-md bg-muted">
                              {index + 1}
                            </div>
                            <div className="flex-1 space-y-2">
                              <Select
                                value={String(step.templateId)}
                                onValueChange={(value) => {
                                  const template = templates.find(
                                    (t) => t.id === Number(value)
                                  );
                                  if (template) {
                                    updateStep(index, {
                                      templateId: Number(value),
                                      requiresApproval: template.requiresExpertise ?? false,
                                      approvalRoles: template.requiresExpertise ? ["expert"] : [],
                                      templateName: template.name,
                                      templateDescription: template.description ?? null,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
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

                              {step.templateDescription && (
                                <p className="text-sm text-muted-foreground">
                                  {step.templateDescription}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2">
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
                    ))}
                  </div>
                )}
              </div>

              {/* Step Configuration */}
              {selectedStepData && (
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
                          value={selectedStepData.waitDuration ?? 0}
                          onChange={(e) =>
                            updateStep(selectedStep, {
                              waitDuration: Math.max(0, parseInt(e.target.value) || 0),
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
                          checked={selectedStepData.isRequired}
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
                          checked={selectedStepData.requiresApproval}
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

                      {selectedStepData.requiresApproval && (
                        <FormItem className="space-y-1">
                          <FormLabel>Approval Roles</FormLabel>
                          <Select
                            value={selectedStepData.approvalRoles[0] || "expert"}
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
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || saveMutation.isPending}>
                    {isLoading || saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedChanges} onOpenChange={setShowUnsavedChanges}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowUnsavedChanges(false)}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={cleanup}>
              Discard Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}