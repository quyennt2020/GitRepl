import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TaskChain, TaskTemplate, InsertTaskChain, insertTaskChainSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Trash2, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  existingChain?: TaskChain;
}

interface StepData {
  id?: number;
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

  // Form setup
  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: existingChain ? {
      name: existingChain.name,
      description: existingChain.description ?? "",
      category: existingChain.category as "water" | "fertilize" | "prune" | "check" | "repot" | "clean",
      isActive: existingChain.isActive ?? true,
    } : {
      name: "",
      description: "",
      category: "water",
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
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

      // Create steps
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
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

    const newStep: StepData = {
      templateId: templates[0].id,
      order: steps.length + 1,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: false,
      approvalRoles: [],
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
  if (templatesQuery.isLoading) {
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
                      <Textarea {...field} placeholder="Describe the chain's purpose" className="resize-none" rows={3} />
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

              {steps.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground border rounded-lg p-4">
                  <AlertCircle className="w-4 h-4" />
                  <p>Add steps to create a task chain</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, index) => {
                    const template = templatesQuery.data?.find(
                      (t) => t.id === step.templateId
                    );

                    return (
                      <Card
                        key={index}
                        className={`${
                          selectedStep === index ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setSelectedStep(index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="min-w-[32px] h-8 flex items-center justify-center border rounded-md bg-muted">
                              {index + 1}
                            </div>

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
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select task" />
                              </SelectTrigger>
                              <SelectContent>
                                {templatesQuery.data?.map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="sr-only">Remove step</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
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
                        onCheckedChange={(checked: boolean) =>
                          updateStep(selectedStep, {
                            isRequired: checked,
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
                        onCheckedChange={(checked: boolean) =>
                          updateStep(selectedStep, {
                            requiresApproval: checked,
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