import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { InsertTaskChain, TaskChain, insertTaskChainSchema, InsertChainStep } from "@shared/schema";
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
import { GripVertical, Plus, Trash2, AlertCircle, Clock, Brain } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { mockTaskTemplates } from "@/lib/mock-data";
import { Separator } from "@/components/ui/separator";

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
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: {
      name: existingChain?.name ?? "",
      description: existingChain?.description ?? "",
      category: existingChain?.category ?? "water",
    },
  });

  // Use mock templates
  const templates = mockTaskTemplates;
  const selectedTemplate = selectedStepIndex !== null && steps[selectedStepIndex]
    ? templates.find(t => t.id === steps[selectedStepIndex].templateId)
    : null;

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
    // Update selected step index if needed
    if (selectedStepIndex === result.source.index) {
      setSelectedStepIndex(result.destination.index);
    }
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
    setSelectedStepIndex(steps.length);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  const updateStep = (index: number, updates: Partial<ChainStepForm>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
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
                    <Textarea {...field} placeholder="Describe the purpose of this chain" className="min-h-[60px]" />
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
                  <FormControl>
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTemplate && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <h4 className="font-medium">Selected Task Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Task:</span>{" "}
                      <span className="font-medium">{selectedTemplate.name}</span>
                    </div>
                    <p className="text-muted-foreground">{selectedTemplate.description}</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {selectedTemplate.estimatedDuration} minutes</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={selectedTemplate.priority === 'high' ? 'destructive' : 'default'}>
                        {selectedTemplate.priority} priority
                      </Badge>
                      {selectedTemplate.requiresExpertise && (
                        <Badge variant="secondary">
                          <Brain className="w-3 h-3 mr-1" />
                          Expert Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
              </>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Chain Steps</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addStep}
                  className="min-h-[32px]"
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
                        const isSelected = selectedStepIndex === index;

                        return (
                          <Draggable key={index} draggableId={`step-${index}`} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border cursor-pointer transition-colors ${isSelected ? 'bg-muted' : ''}`}
                                onClick={() => setSelectedStepIndex(index)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps} className="touch-manipulation">
                                      <Badge variant="outline" className="select-none">
                                        {index + 1}
                                      </Badge>
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
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
                                          <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select template" />
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

                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`required-${index}`}
                                            checked={step.isRequired}
                                            onCheckedChange={(checked) =>
                                              updateStep(index, { isRequired: checked as boolean })
                                            }
                                          />
                                          <label htmlFor={`required-${index}`} className="text-sm">Required</label>
                                        </div>

                                        {template && (
                                          <Badge 
                                            variant={template.priority === 'high' ? 'destructive' : 'default'}
                                            className="ml-auto"
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
                                          className="h-8 w-8 ml-2"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span className="sr-only">Remove step</span>
                                        </Button>
                                      </div>
                                    </div>
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
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                className="min-h-[40px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createChainMutation.isPending}
                className="min-h-[40px]"
              >
                {createChainMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}