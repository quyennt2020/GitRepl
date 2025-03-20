import { useState } from "react";
import { TaskChain } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Edit2, Trash2, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Props {
  chains: TaskChain[];
  onEdit: (chain: TaskChain) => void;
}

interface ChainStep {
  id: number;
  chainId: number;
  templateId: number;
  order: number;
  isRequired: boolean;
  waitDuration: number;
  requiresApproval: boolean;
  approvalRoles: string[];
  templateName: string;
  templateDescription: string | null;
}

export default function ChainList({ chains, onEdit }: Props) {
  const { toast } = useToast();
  const [expandedChain, setExpandedChain] = useState<number | null>(null);

  // Query steps only for the expanded chain
  const { data: chainSteps = [], isLoading: stepsLoading } = useQuery<ChainStep[]>({
    queryKey: ["/api/task-chains", expandedChain, "steps"],
    queryFn: async () => {
      if (!expandedChain) return [];

      console.log(`Fetching steps for chain ${expandedChain}`);
      const response = await fetch(`/api/task-chains/${expandedChain}/steps`);
      if (!response.ok) {
        throw new Error("Failed to fetch chain steps");
      }

      const steps = await response.json();
      console.log(`Chain ${expandedChain} steps:`, steps);
      return steps;
    },
    enabled: expandedChain !== null,
    staleTime: 0, // Don't cache results
    cacheTime: 0, // Remove from cache immediately
  });

  const deleteChainMutation = useMutation({
    mutationFn: async (chainId: number) => {
      const response = await fetch(`/api/task-chains/${chainId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete chain");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
      toast({ title: "Chain deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete chain",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  if (!chains?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No task chains found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chains.map((chain) => (
        <Card key={chain.id}>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Chain Header */}
              <div 
                className="flex items-start justify-between cursor-pointer"
                onClick={() => {
                  // Reset steps state when collapsing or changing chains
                  if (expandedChain === chain.id) {
                    setExpandedChain(null);
                    queryClient.removeQueries({ queryKey: ["/api/task-chains", chain.id, "steps"] });
                  } else {
                    if (expandedChain) {
                      queryClient.removeQueries({ queryKey: ["/api/task-chains", expandedChain, "steps"] });
                    }
                    setExpandedChain(chain.id);
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  {expandedChain === chain.id ? (
                    <ChevronDown className="w-5 h-5 mt-1" />
                  ) : (
                    <ChevronRight className="w-5 h-5 mt-1" />
                  )}
                  <div>
                    <h3 className="font-medium">{chain.name}</h3>
                    {chain.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {chain.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(chain);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this chain?")) {
                        deleteChainMutation.mutate(chain.id);
                      }
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>

              {/* Chain Metadata */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{chain.category}</Badge>
                <Badge variant="outline">
                  {chain.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Steps List - Only show for expanded chain */}
              {expandedChain === chain.id && (
                <div className="pt-2 border-t">
                  {stepsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : chainSteps.length > 0 ? (
                    <div className="space-y-2">
                      {chainSteps
                        .sort((a, b) => a.order - b.order)
                        .map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="min-w-[32px] h-8 flex items-center justify-center border rounded-md bg-muted">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {step.templateName}
                                </span>
                                <div className="flex gap-1.5 flex-wrap">
                                  {step.waitDuration > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      <Clock className="w-3 h-3" />
                                      {step.waitDuration}h
                                    </Badge>
                                  )}
                                  {step.requiresApproval && (
                                    <Badge
                                      variant="outline"
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      <Shield className="w-3 h-3" />
                                      Needs Approval
                                    </Badge>
                                  )}
                                  {!step.isRequired && (
                                    <Badge variant="outline" className="text-xs">
                                      Optional
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {step.templateDescription && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {step.templateDescription}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-3">
                      No steps defined for this chain
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}