import { TaskChain, ChainStep } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface ChainListProps {
  chains: TaskChain[];
  onEdit: (chain: TaskChain) => void;
}

export default function ChainList({ chains, onEdit }: ChainListProps) {
  const { toast } = useToast();

  // Load steps for each chain with proper query configuration
  const stepsQueries = chains.map(chain => {
    const query = useQuery<ChainStep[]>({
      queryKey: ['/api/task-chains', chain.id, 'steps'],
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false
    });
    return { chainId: chain.id, ...query };
  });

  const deleteChainMutation = useMutation({
    mutationFn: async (chainId: number) => {
      const response = await fetch(`/api/task-chains/${chainId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete chain');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-chains'] });
      toast({
        title: "Chain deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to delete chain:", error);
      toast({
        title: "Failed to delete chain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Show loading state while any chain's steps are loading
  if (stepsQueries.some(query => query.isLoading)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Loading task chains...
      </div>
    );
  }

  if (!chains?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No task chains created yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chains.map((chain) => {
        // Find the corresponding steps query for this chain
        const stepsQuery = stepsQueries.find(q => q.chainId === chain.id);
        const steps = stepsQuery?.data || [];

        return (
          <Card key={chain.id} className="flex flex-col hover:bg-muted/50">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{chain.name}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(chain)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteChainMutation.mutate(chain.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {chain.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {chain.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {chain.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                  </Badge>
                </div>
                {/* Display step details */}
                {steps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => (
                        <div key={step.id} className="flex items-center gap-2 text-sm">
                          <span className="min-w-[20px] text-center">{index + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Template ID: {step.templateId}</span>
                              {step.waitDuration > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Wait {step.waitDuration}h
                                </Badge>
                              )}
                              {step.requiresApproval && (
                                <Badge variant="outline" className="text-xs">
                                  Needs Approval
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}