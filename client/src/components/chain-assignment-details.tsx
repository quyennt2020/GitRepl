import { useQuery } from "@tanstack/react-query";
import { ChainAssignment, ChainStep, TaskChain } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Shield, AlertCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import PendingApprovals from "./pending-approvals";

interface Props {
  assignmentId: number;
}

export default function ChainAssignmentDetails({ assignmentId }: Props) {
  // Fetch assignment details
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<ChainAssignment>({
    queryKey: ["/api/chain-assignments", assignmentId],
    enabled: !!assignmentId,
  });

  // Fetch chain details
  const { data: chain, isLoading: isLoadingChain } = useQuery<TaskChain>({
    queryKey: ["/api/task-chains", assignment?.chainId],
    enabled: !!assignment?.chainId,
  });

  // Fetch steps with template details
  const { data: steps = [], isLoading: isLoadingSteps } = useQuery<(ChainStep & { templateName: string; templateDescription: string | null })[]>({
    queryKey: ["/api/task-chains", assignment?.chainId, "steps"],
    enabled: !!assignment?.chainId,
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
        No chain details available
      </div>
    );
  }

  // Calculate progress percentage
  const currentStepIndex = steps.findIndex(s => s.id === assignment.currentStepId);
  const progressPercentage = assignment.status === "completed" 
    ? 100 
    : currentStepIndex >= 0 
      ? Math.round((currentStepIndex / steps.length) * 100)
      : 0;

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
                const isCompleted = assignment.status === "completed" || index < currentStepIndex;
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