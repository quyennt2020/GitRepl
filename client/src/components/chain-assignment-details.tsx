import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChainAssignment, ChainStep, TaskChain } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Props {
  assignmentId: number;
}

export default function ChainAssignmentDetails({ assignmentId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Improved assignment query with better options
  const { 
    data: assignment, 
    isLoading: isLoadingAssignment,
    isError: isAssignmentError
  } = useQuery({
    queryKey: ["assignments", assignmentId],  // Simplified query key
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
    queryKey: ["chains", assignment?.chainId], // Simplified query key
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

  // Show detailed loading state
  if (isLoadingAssignment) {
    return <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      <span className="ml-3">Loading assignment...</span>
    </div>;
  }

  // Handle assignment not found
  if (!assignment || isAssignmentError) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="space-y-2">
          <p>Assignment not found</p>
          <p className="text-sm">Assignment ID: {assignmentId}</p>
          <Button onClick={() => window.history.back()} className="mt-4">
            Back to Assignments
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state for chain
  if (isLoadingChain) {
    return <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      <span className="ml-3">Loading chain details...</span>
    </div>;
  }

  // Handle chain not found
  if (!chain || isChainError) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="space-y-2">
          <p>Chain not found</p>
          <p className="text-sm">Assignment ID: {assignmentId}</p>
          <p className="text-sm">Chain ID: {assignment?.chainId}</p>
          <Button onClick={() => window.history.back()} className="mt-4">
            Back to Assignments
          </Button>
        </div>
      </div>
    );
  }

  // We now have both assignment and chain data, calculate progress
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

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
            <h2 className="text-xl font-bold text-gray-800">{chain.name}</h2>
            <p className="text-gray-500">{chain.description}</p>
            <p className="text-sm text-gray-500 mt-2">Started {format(new Date(assignment.startedAt), "MMMM do, yyyy")}</p>
          </div>
          <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200 rounded-full px-4 py-1">
            {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
          </Badge>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between mb-2">
            <div>
              <h3 className="font-bold">Progress <span className="text-gray-500">{progressPercentage}%</span></h3>
            </div>
            <div className="text-right">
              <p className="text-gray-500">{completedSteps} of {totalSteps} steps completed</p>
              <p className="text-blue-500">In progress</p>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Rest of the component (steps timeline, etc.) remains the same */}
        
      </div>
    </div>
  );
}