import { useQuery } from "@tanstack/react-query";
import { ChainAssignment, ChainStep, TaskChain, TaskTemplate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import PendingApprovals from "./pending-approvals";

interface Props {
  assignmentId: number;
}

export default function ChainAssignmentDetails({ assignmentId }: Props) {
  const { data: assignment } = useQuery<ChainAssignment>({
    queryKey: ["/api/chain-assignments", assignmentId],
    enabled: !!assignmentId,
  });

  const { data: chain } = useQuery<TaskChain>({
    queryKey: ["/api/task-chains", assignment?.chainId],
    enabled: !!assignment?.chainId,
  });

  const { data: steps = [] } = useQuery<ChainStep[]>({
    queryKey: ["/api/task-chains", assignment?.chainId, "steps"],
    enabled: !!assignment?.chainId,
  });

  // Get template information for each step
  const { data: templates = [] } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
    enabled: !!steps.length,
  });

  // Combine step data with template information
  const stepsWithTemplates = steps.map(step => {
    const template = templates.find(t => t.id === step.templateId);
    return {
      ...step,
      templateName: template?.name ?? "Unknown Task",
      templateDescription: template?.description ?? null,
    };
  });

  if (!assignment || !chain) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{chain.name}</span>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{chain.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Started {format(new Date(assignment.startedAt || new Date()), "PPP")}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Progress</h3>
              <div className="space-y-2">
                {stepsWithTemplates.map((step, index) => {
                  const isCurrentStep = step.id === assignment.currentStepId;
                  const isCompleted = index + 1 < (stepsWithTemplates.findIndex(s => s.id === assignment.currentStepId) + 1);

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2 p-2 rounded-md ${
                        isCurrentStep ? "bg-muted" : ""
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full border-2 ${
                            isCurrentStep ? "border-primary" : "border-muted-foreground"
                          }`}
                        />
                      )}
                      <span className={isCompleted ? "line-through" : ""}>
                        {step.templateName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

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