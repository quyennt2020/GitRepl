import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChainStep, ChainAssignment, TaskTemplate } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ChevronRight } from "lucide-react";
import StepApprovalDialog from "./step-approval-dialog";

interface Props {
  assignmentId: number;
  currentStepId: number | null;
}

export default function PendingApprovals({ assignmentId, currentStepId }: Props) {
  const [selectedStep, setSelectedStep] = useState<ChainStep | null>(null);

  // Get assignment details
  const { data: assignment } = useQuery<ChainAssignment>({
    queryKey: ["/api/chain-assignments", assignmentId],
    enabled: !!assignmentId,
  });

  // Get chain steps
  const { data: steps = [] } = useQuery<ChainStep[]>({
    queryKey: ["/api/task-chains", assignment?.chainId, "steps"],
    enabled: !!assignment?.chainId,
  });

  // Get template details
  const { data: template } = useQuery<TaskTemplate>({
    queryKey: ["/api/task-templates", steps.find(s => s.id === currentStepId)?.templateId],
    enabled: !!steps.find(s => s.id === currentStepId)?.templateId,
  });

  // Get current step that needs approval
  const currentStep = steps.find(step => 
    step.id === currentStepId && step.requiresApproval
  );

  if (!currentStep || !template) {
    return null;
  }

  return (
    <>
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-muted-foreground">
                  This step requires approval before proceeding
                </p>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStep(currentStep)}
              className="flex items-center gap-2"
            >
              Review
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedStep && (
        <StepApprovalDialog
          open={!!selectedStep}
          onClose={() => setSelectedStep(null)}
          step={selectedStep}
          assignmentId={assignmentId}
        />
      )}
    </>
  );
}