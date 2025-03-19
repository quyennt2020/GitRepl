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
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ChainBuilderProps {
  open: boolean;
  onClose: () => void;
  existingChain?: TaskChain;
}

interface ChainStepForm extends InsertChainStep {
  templateName?: string;
}

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

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const createChainMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      const res = await apiRequest(
        existingChain ? "PATCH" : "POST",
        existingChain ? `/api/task-chains/${existingChain.id}` : "/api/task-chains",
        data
      );
      const chain = await res.json();

      // Create steps for the chain
      if (steps.length > 0) {
        await Promise.all(
          steps.map((step, index) =>
            apiRequest("POST", "/api/chain-steps", {
              ...step,
              chainId: chain.id,
              order: index + 1,
            })
          )
        );
      }

      return chain;
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
    const newStep: ChainStepForm = {
      templateId: templates?.[0]?.id ?? 0,
      templateName: templates?.[0]?.name,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: false,
      approvalRoles: [],
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
      <DialogContent className="sm:max-w-[600px]">
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
                    <Input {...field} placeholder="Chain description" />
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
                              className="border"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 space-y-4">
                                    <Select
                                      value={String(step.templateId)}
                                      onValueChange={(value) => {
                                        const template = templates?.find(t => t.id === Number(value));
                                        updateStep(index, {
                                          templateId: Number(value),
                                          templateName: template?.name
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {templates?.map((template) => (
                                          <SelectItem
                                            key={template.id}
                                            value={String(template.id)}
                                          >
                                            {template.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <div className="flex gap-4">
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
                                            updateStep(index, { requiresApproval: checked as boolean })
                                          }
                                        />
                                        <label htmlFor={`approval-${index}`}>Needs Approval</label>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <FormItem className="flex-1">
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
                      ))}
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