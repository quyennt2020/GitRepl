import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChainAssignment, ChainStep } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  assignmentId: number;
}

export default function ChainAssignmentDetails({ assignmentId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  // Improved assignment query with better options
  const { 
    data: assignment, 
    isLoading: isLoadingAssignment,
    isError: isAssignmentError
  } = useQuery({
    queryKey: ["assignments", assignmentId],
    queryFn: async () => {
      const response = await fetch(`/api/chain-assignments/${assignmentId}`);
      if (!response.ok) throw new Error(`Assignment fetch failed: ${response.status}`);
      return response.json();
    },
    staleTime: 0,
    retry: 2,
    retryDelay: 1000
  });

  // Improved chain query
  const { 
    data: chain, 
    isLoading: isLoadingChain,
    isError: isChainError
  } = useQuery({
    queryKey: ["chains", assignment?.chainId],
    queryFn: async () => {
      const response = await fetch(`/api/task-chains/${assignment?.chainId}`);
      if (!response.ok) throw new Error(`Chain fetch failed: ${response.status}`);
      return response.json();
    },
    enabled: !!assignment?.chainId,
    staleTime: 0,
    retry: 2
  });

  // Fetch steps with improved options
  const { 
    data: steps = [], 
    isLoading: isLoadingSteps
  } = useQuery({
    queryKey: ["steps", assignment?.chainId, assignmentId],
    queryFn: async () => {
      const response = await fetch(`/api/task-chains/${assignment?.chainId}/steps/${assignmentId}`);
      if (!response.ok) throw new Error('Failed to fetch steps');
      return response.json();
    },
    enabled: !!assignment?.chainId && !!chain,
    staleTime: 0
  });

  useEffect(() => {
    if (steps && steps.length > 0) {
      const completedSteps = steps.filter((s: any) => s.isCompleted).length;
      const progressPercentage = Math.round((completedSteps / steps.length) * 100);
      setProgress(progressPercentage);
    } else {
      setProgress(0);
    }
  }, [steps]);

  // Mutation for completing a step
  const completeStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const response = await fetch(`/api/chain-assignments/${assignmentId}/steps/${stepId}/complete`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to complete step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["steps"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast({
        title: "Step completed",
        description: "The task has been marked as complete and the chain has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete the step. Please try again.",
        variant: "destructive",
      });
    },
  });

  let completedSteps = steps.filter((s: ChainStep) => s.isCompleted).length;
  let totalSteps = steps.length;
  let progressPercentage = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

  console.log("[ChainAssignmentDetails] assignment:", assignment);
  console.log("[ChainAssignmentDetails] steps:", steps);
  console.log("[ChainAssignmentDetails] completedSteps:", completedSteps);
  console.log("[ChainAssignmentDetails] totalSteps:", totalSteps);
  console.log("[ChainAssignmentDetails] progressPercentage:", progressPercentage);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-5">Task Chain Assignments</h1>

      <Button
        variant="outline"
        onClick={() => window.history.back()}
        className="mb-6"
      >
        ← Back to All Assignments
      </Button>

      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-start mb-2">
          <div>
<h2 className="text-xl font-bold text-gray-800">{chain?.name}</h2>
            <p className="text-gray-500">{chain?.description ?? ''}</p>
<p className="text-sm text-gray-500 mt-2">
              Started {assignment?.startedAt ? format(new Date(assignment.startedAt), "MMMM do, yyyy") : ''}
            </p>
          </div>
          <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200 rounded-full px-4 py-1">
            {assignment.status === "completed" ? "Completed" : "In progress"}
          </Badge>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between mb-2">
            <div>
              <h3 className="font-bold">
                Progress <span className="text-gray-500">{progressPercentage}%</span>
              </h3>
            </div>
            <div className="text-right">
              {totalSteps === 0 ? (
                <p className="text-gray-500">No steps defined</p>
              ) : (
                <p className="text-gray-500">
                  {completedSteps} of {totalSteps} steps completed
                </p>
              )}
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Steps</h3>
          <div className="relative">
            {steps.map((step: any, index: number) => {
              let statusBadge = null;
              if (step.isCompleted) {
                statusBadge = <Badge className="ml-2 bg-green-100 text-green-500 border-0">Completed</Badge>;
              } else if (step.requiresApproval) {
                statusBadge = <Badge className="ml-2 bg-yellow-100 text-yellow-500 border-0">Needs Approval</Badge>;
              }

              return (
                <div key={step.id} className="mb-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center relative">
                      {/* Vertical line */}
                      {index > 0 && (
                        <div className="absolute top-0 left-1/2 h-full w-[2px] bg-gray-300 -translate-x-1/2"></div>
                      )}

                      {/* Circle with checkmark or number */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}>
                        {step.isCompleted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-gray-500">{index + 1}</span>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col">
                      <h4 className="font-semibold">{step.templateName} {statusBadge}</h4>
                      <p className="text-gray-500">{step.templateDescription}</p>

                      <div className="mt-2">
                        {!step.isCompleted && !step.requiresApproval && (
                          <Button size="sm" onClick={() => completeStepMutation.mutate(step.id)}>
                            Complete Step
                          </Button>
                        )}
                        {step.requiresApproval && (
                          <Button size="sm" variant="secondary">
                            Review Step
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
