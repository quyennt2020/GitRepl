import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { InsertTaskChain, TaskChain, TaskTemplate, insertTaskChainSchema, InsertChainStep, insertChainStepSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { GripVertical, Plus, Trash2, AlertCircle, Clock, Brain } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { mockTaskTemplates } from "@/lib/mock-data";

interface ChainBuilderProps {
  open: boolean;
  onClose: () => void;
  existingChain?: TaskChain;
}

interface ChainStepForm extends InsertChainStep {
  templateName?: string;
  condition?: {
    type: 'healthScore' | 'taskCompletion' | 'time';
    operator: '>' | '<' | '==' | '>=' | '<=';
    value: string;
  };
}

const ROLES = ['owner', 'manager', 'expert', 'caretaker'] as const;

export default function ChainBuilder({ open, onClose, existingChain }: ChainBuilderProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<ChainStepForm[]>([]);

  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: {
      name: existingChain?.name ?? "",
      description: existingChain?.description ?? "",
      category: (existingChain?.category ?? "water") as InsertTaskChain["category"],
    },
  });

  // Use mock templates directly
  const templates = mockTaskTemplates;

  const createChainMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      console.log("Creating chain with data:", { chain: data, steps });
      // Mock successful creation
      return { id: Math.random(), ...data };
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSteps(items);
  };

  const addStep = () => {
    const template = templates[0];
    const newStep: ChainStepForm = {
      templateId: template.id,
      templateName: template.name,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: template.requiresExpertise,
      approvalRoles: template.requiresExpertise ? ['expert'] : [],
      chainId: 0,
      order: steps.length + 1,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const updateStep = (index: number, updates: Partial<ChainStepForm>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{existingChain ? "Edit" : "Create"} Task Chain</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Chain name" />
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
                    <Textarea {...field} placeholder="Describe the purpose of this chain" />
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
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
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

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Chain Steps</h3>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
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

                        return (
                          <Draggable key={index} draggableId={`step-${index}`} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="border"
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{`Step ${index + 1}`}</Badge>
                                        {step.isRequired && (
                                          <Badge variant="secondary">Required</Badge>
                                        )}
                                        {template?.requiresExpertise && (
                                          <Badge variant="secondary">
                                            <Brain className="w-3 h-3 mr-1" />
                                            Expertise Required
                                          </Badge>
                                        )}
                                        {template && (
                                          <Badge variant={template.priority === 'high' ? 'destructive' : 'default'}>
                                            {template.priority} priority
                                          </Badge>
                                        )}
                                      </div>

                                      <Select
                                        value={String(step.templateId)}
                                        onValueChange={(value) => {
                                          const template = templates.find(t => t.id === Number(value));
                                          if (template) {
                                            updateStep(index, {
                                              templateId: Number(value),
                                              templateName: template.name,
                                              requiresApproval: template.requiresExpertise,
                                              approvalRoles: template.requiresExpertise ? ['expert'] : [],
                                            });
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {templates.map((template) => (
                                            <SelectItem
                                              key={template.id}
                                              value={String(template.id)}
                                            >
                                              <div className="flex items-center">
                                                <span>{template.name}</span>
                                                {template.requiresExpertise && (
                                                  <Brain className="w-3 h-3 ml-2" />
                                                )}
                                                <Clock className="w-3 h-3 ml-2" />
                                                <span className="text-xs ml-1">
                                                  {template.estimatedDuration}min
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      {template && (
                                        <p className="text-sm text-muted-foreground">
                                          {template.description}
                                        </p>
                                      )}

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`required-${index}`}
                                              checked={step.isRequired}
                                              onCheckedChange={(checked) =>
                                                updateStep(index, { isRequired: checked as boolean })
                                              }
                                            />
                                            <label htmlFor={`required-${index}`}>Required</label>
                                          </div>

                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`approval-${index}`}
                                              checked={step.requiresApproval}
                                              onCheckedChange={(checked) =>
                                                updateStep(index, { 
                                                  requiresApproval: checked as boolean,
                                                  approvalRoles: checked ? ['expert'] : []
                                                })
                                              }
                                            />
                                            <label htmlFor={`approval-${index}`}>Needs Approval</label>
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <FormItem>
                                            <FormLabel>Wait Duration (hours)</FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                min="0"
                                                value={step.waitDuration}
                                                onChange={(e) =>
                                                  updateStep(index, {
                                                    waitDuration: parseInt(e.target.value) || 0,
                                                  })
                                                }
                                              />
                                            </FormControl>
                                          </FormItem>
                                        </div>
                                      </div>

                                      {step.requiresApproval && (
                                        <div className="space-y-2">
                                          <FormLabel>Approval Roles</FormLabel>
                                          <div className="flex flex-wrap gap-2">
                                            {ROLES.map((role) => (
                                              <Badge
                                                key={role}
                                                variant={step.approvalRoles?.includes(role) ? "default" : "outline"}
                                                className="cursor-pointer"
                                                onClick={() => {
                                                  const roles = step.approvalRoles || [];
                                                  const newRoles = roles.includes(role)
                                                    ? roles.filter((r) => r !== role)
                                                    : [...roles, role];
                                                  updateStep(index, { approvalRoles: newRoles });
                                                }}
                                              >
                                                {role}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="space-y-2">
                                        <FormLabel>Activation Condition</FormLabel>
                                        <div className="flex gap-2">
                                          <Select
                                            value={step.condition?.type || ""}
                                            onValueChange={(value) =>
                                              updateStep(index, {
                                                condition: {
                                                  type: value as any,
                                                  operator: ">",
                                                  value: "",
                                                },
                                              })
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select condition type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="healthScore">Health Score</SelectItem>
                                              <SelectItem value="taskCompletion">Task Completion</SelectItem>
                                              <SelectItem value="time">Time Based</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {step.condition && (
                                            <>
                                              <Select
                                                value={step.condition.operator}
                                                onValueChange={(value) =>
                                                  updateStep(index, {
                                                    condition: {
                                                      ...step.condition!,
                                                      operator: value as any,
                                                    },
                                                  })
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value=">">greater than</SelectItem>
                                                  <SelectItem value="<">less than</SelectItem>
                                                  <SelectItem value="==">equals</SelectItem>
                                                  <SelectItem value=">=">greater or equal</SelectItem>
                                                  <SelectItem value="<=">less or equal</SelectItem>
                                                </SelectContent>
                                              </Select>

                                              <Input
                                                placeholder="Value"
                                                value={step.condition.value}
                                                onChange={(e) =>
                                                  updateStep(index, {
                                                    condition: {
                                                      ...step.condition!,
                                                      value: e.target.value,
                                                    },
                                                  })
                                                }
                                              />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeStep(index)}
                                    >
                                      <Trash2 className="w-4 h-4" />
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createChainMutation.isPending}>
                {createChainMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}