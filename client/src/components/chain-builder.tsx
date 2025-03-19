import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, GripVertical, Plus, Trash2 } from 'lucide-react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InsertTaskChain, TaskChain, TaskTemplate, InsertChainStep, ChainStep, insertTaskChainSchema } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

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
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<ChainStepForm[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const form = useForm<InsertTaskChain>({
    resolver: zodResolver(insertTaskChainSchema),
    defaultValues: {
      name: existingChain?.name ?? '',
      description: existingChain?.description ?? '',
      category: existingChain?.category ?? '',
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery<TaskTemplate[]>({
    queryKey: ['/api/task-templates'],
  });

  // Fetch chain steps for existing chain
  useQuery<ChainStep[]>({
    queryKey: ['/api/task-chains', existingChain?.id, 'steps'],
    enabled: !!existingChain?.id,
    onSuccess: (data) => {
      const formattedSteps = data
        .sort((a, b) => a.order - b.order)
        .map(step => ({
          templateId: step.templateId,
          order: step.order,
          isRequired: step.isRequired ?? true,
          waitDuration: step.waitDuration ?? 0,
          requiresApproval: step.requiresApproval ?? false,
          approvalRoles: step.approvalRoles ?? [],
          templateName: templates.find(t => t.id === step.templateId)?.name
        }));
      setSteps(formattedSteps);
    },
    onError: (error) => {
      console.error('Error fetching chain steps:', error);
      toast({
        title: "Error loading chain steps",
        description: error instanceof Error ? error.message : "Failed to load chain steps",
        variant: "destructive",
      });
    }
  });

  const createChainMutation = useMutation({
    mutationFn: async (data: InsertTaskChain) => {
      let chainId: number;

      if (existingChain) {
        // Update chain
        const chainResponse = await fetch(`/api/task-chains/${existingChain.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!chainResponse.ok) throw new Error('Failed to update chain');
        const updatedChain = await chainResponse.json();
        chainId = updatedChain.id;

        // Delete existing steps
        await Promise.all((existingChain.steps ?? []).map(step =>
          fetch(`/api/chain-steps/${step.id}`, { method: 'DELETE' })
        ));
      } else {
        // Create new chain
        const chainResponse = await fetch('/api/task-chains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!chainResponse.ok) throw new Error('Failed to create chain');
        const newChain = await chainResponse.json();
        chainId = newChain.id;
      }

      // Create steps
      await Promise.all(steps.map(step =>
        fetch('/api/chain-steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...step, chainId })
        })
      ));

      return chainId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-chains'] });
      onClose();
      toast({
        title: `Chain ${existingChain ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error) => {
      console.error('Error saving chain:', error);
      toast({
        title: `Error ${existingChain ? 'updating' : 'creating'} chain`,
        description: error instanceof Error ? error.message : "Failed to save chain",
        variant: "destructive",
      });
    }
  });

  const addStep = () => {
    const newStep: ChainStepForm = {
      templateId: templates[0]?.id ?? 0,
      order: steps.length + 1,
      isRequired: true,
      waitDuration: 0,
      requiresApproval: false,
      approvalRoles: [],
      templateName: templates[0]?.name
    };
    setSteps([...steps, newStep]);
    setSelectedStepIndex(steps.length);
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
      order: index + 1
    }));

    setSteps(reorderedSteps);
    if (selectedStepIndex === result.source.index) {
      setSelectedStepIndex(result.destination.index);
    }
  };

  const onSubmit = (values: InsertTaskChain) => {
    if (steps.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one step to the chain",
        variant: "destructive",
      });
      return;
    }
    createChainMutation.mutate(values);
  };

  const updateStep = (index: number, updates: Partial<ChainStepForm>) => {
    setSteps(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], ...updates };
      if (updates.templateId) {
        updated[index].templateName = templates.find(t => t.id === updates.templateId)?.name;
      }
      return updated;
    });
  };

  const selectedStep = selectedStepIndex !== null ? steps[selectedStepIndex] : null;
  const selectedTemplate = selectedStep ? templates.find(t => t.id === selectedStep.templateId) : null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingChain ? "Edit Task Chain" : "New Task Chain"}</DialogTitle>
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                                  className={`border ${isSelected ? 'border-primary' : ''}`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2">
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium">{template?.name}</p>
                                        <div className="flex gap-2 mt-1">
                                          {step.isRequired && (
                                            <Badge variant="secondary">Required</Badge>
                                          )}
                                          {step.requiresApproval && (
                                            <Badge variant="secondary">Needs Approval</Badge>
                                          )}
                                          {step.waitDuration > 0 && (
                                            <Badge variant="secondary">
                                              Wait {step.waitDuration}h
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setSelectedStepIndex(isSelected ? null : index)}
                                        >
                                          {isSelected ? 'Done' : 'Edit'}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeStep(index)}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="mt-4 space-y-4">
                                        <div className="space-y-2">
                                          <FormLabel>Template</FormLabel>
                                          <Select
                                            value={step.templateId.toString()}
                                            onValueChange={(value) =>
                                              updateStep(index, { templateId: parseInt(value) })
                                            }
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {templates.map((template) => (
                                                <SelectItem
                                                  key={template.id}
                                                  value={template.id.toString()}
                                                >
                                                  {template.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`required-${index}`}
                                            checked={step.isRequired}
                                            onCheckedChange={(checked) =>
                                              updateStep(index, { isRequired: !!checked })
                                            }
                                          />
                                          <label htmlFor={`required-${index}`}>Required</label>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`approval-${index}`}
                                            checked={step.requiresApproval}
                                            onCheckedChange={(checked) =>
                                              updateStep(index, { requiresApproval: !!checked })
                                            }
                                          />
                                          <label htmlFor={`approval-${index}`}>
                                            Requires Approval
                                          </label>
                                        </div>

                                        <div className="space-y-2">
                                          <FormLabel>Wait Duration (hours)</FormLabel>
                                          <Input
                                            type="number"
                                            min="0"
                                            value={step.waitDuration}
                                            onChange={(e) =>
                                              updateStep(index, {
                                                waitDuration: parseInt(e.target.value) || 0
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                    )}
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
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