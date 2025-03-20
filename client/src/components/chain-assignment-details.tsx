import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChainAssignment, ChainStep, TaskChain } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Shield, AlertCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import PendingApprovals from "./pending-approvals";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  assignmentId: number;
}

export default function ChainAssignmentDetails({ assignmentId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assignment details
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<ChainAssignment>({
    queryKey: ["/api/chain-assignments", assignmentId],
    enabled: !!assignmentId,
    refetchOnMount: true,
  });

  // Fetch chain details
  const { data: chain, isLoading: isLoadingChain } = useQuery<TaskChain>({
    queryKey: ["/api/task-chains", assignment?.chainId],
    enabled: !!assignment?.chainId,
    refetchOnMount: true,
  });

  // Fetch steps with progress
  const { data: steps = [], isLoading: isLoadingSteps } = useQuery<(ChainStep & {
    templateName: string;
    templateDescription: string | null;
    isCompleted: boolean;
    careTaskId?: number;
  })[]>({
    queryKey: ["/api/task-chains", assignment?.chainId, "steps", assignmentId],
    enabled: !!assignment?.chainId,
    refetchOnMount: true,
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
      queryClient.invalidateQueries({ queryKey: ["/api/chain-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
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

  if (isLoadingAssignment || isLoadingChain || isLoadingSteps) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!assignment || !chain || !steps.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="space-y-2">
          <p>No chain details available</p>
          <p className="text-sm">Assignment ID: {assignmentId}</p>
          <p className="text-sm">Chain ID: {assignment?.chainId}</p>
          <p className="text-sm">Steps count: {steps.length}</p>
        </div>
      </div>
    );
  }

  // Calculate progress percentage based on completed steps
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const progressPercentage = assignment.status === "completed"
    ? 100
    : Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>{chain.name}</CardTitle>
            <Badge
              variant={
                assignment.status === "completed"
                  ? "default"
                  : assignment.status === "cancelled"
                  ? "destructive"
                  : "outline"
              }
            >
              {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{chain.description}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Started {format(new Date(assignment.startedAt || new Date()), "PPP")}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Steps Timeline */}
            <div className="relative space-y-4">
              {steps.map((step, index) => {
                const isCurrentStep = step.id === assignment.currentStepId;
                const isCompleted = step.isCompleted;
                const isPending = !isCompleted && !isCurrentStep;

                return (
                  <div
                    key={step.id}
                    className={`relative flex items-start gap-4 pb-4 ${
                      index < steps.length - 1
                        ? "border-l-2 border-dashed ml-[15px]"
                        : ""
                    }`}
                  >
                    {/* Status Icon */}
                    <div
                      className={`absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-background ${
                        isCurrentStep
                          ? "border-primary"
                          : isCompleted
                          ? "border-green-500"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : isCurrentStep ? (
                        <ChevronRight className="w-4 h-4 text-primary" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className={`flex-1 ml-6 ${isPending ? "opacity-50" : ""}`}>
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{step.templateName}</h3>
                              <div className="flex gap-2">
                                {step.requiresApproval && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Approval Required
                                  </Badge>
                                )}
                                {!step.isRequired && (
                                  <Badge variant="outline">Optional</Badge>
                                )}
                                {isCurrentStep && !isCompleted && !step.requiresApproval && (
                                  <Button
                                    size="sm"
                                    onClick={() => completeStepMutation.mutate(step.id)}
                                    disabled={completeStepMutation.isPending}
                                  >
                                    Complete Step
                                  </Button>
                                )}
                              </div>
                            </div>
                            {step.templateDescription && (
                              <p className="text-sm text-muted-foreground">
                                {step.templateDescription}
                              </p>
                            )}
                            {step.waitDuration && step.waitDuration > 0 && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                Wait {step.waitDuration}h after previous step
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pending Approvals Section */}
            {assignment.status === "active" && (
              <PendingApprovals
                assignmentId={assignmentId}
                currentStepId={assignment.currentStepId}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}