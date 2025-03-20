import { useQuery } from "@tanstack/react-query";
import { ChainAssignment, Plant, TaskTemplate, ChainStep } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sprout, Shield, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ChainAssignmentDetails from "./chain-assignment-details";
import { format } from "date-fns";

export default function ChainAssignmentsList() {
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);

  // Fetch assignments with explicit staleTime and refetch settings
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<ChainAssignment[]>({
    queryKey: ["/api/chain-assignments"],
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  // Get plant information for each assignment
  const { data: plants = [], isLoading: isLoadingPlants } = useQuery<Plant[]>({
    queryKey: ["/api/plants"],
    enabled: assignments.length > 0,
  });

  // Get current steps information
  const chainStepsQueries = assignments.map(assignment => ({
    queryKey: ["/api/task-chains", assignment.chainId, "steps"],
    enabled: !!assignment.chainId,
  }));

  const { data: chainStepsResults = [] } = useQuery<ChainStep[][]>({
    queryKey: ["chain-steps-batch"],
    enabled: assignments.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        assignments.map(async assignment => {
          const response = await fetch(`/api/task-chains/${assignment.chainId}/steps`);
          return response.json();
        })
      );
      return results;
    },
  });

  // Get template information for current steps
  const templateIds = assignments
    .map(a => chainStepsResults
      .flat()
      .find(s => s.id === a.currentStepId)?.templateId)
    .filter(Boolean);

  const { data: templates = [] } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
    enabled: templateIds.length > 0,
  });

  if (isLoadingAssignments || isLoadingPlants) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Combine assignment data with plant information
  const assignmentsWithDetails = assignments.map(assignment => {
    const plant = plants.find(p => p.id === assignment.plantId);
    const steps = chainStepsResults.find(steps => 
      steps?.some(step => step.chainId === assignment.chainId)
    ) || [];
    const currentStep = steps.find(s => s?.id === assignment.currentStepId);
    const template = templates.find(t => t.id === currentStep?.templateId);
    const stepNumber = currentStep ? steps.findIndex(s => s.id === currentStep.id) + 1 : 0;

    return {
      ...assignment,
      plantName: plant?.name ?? "Unknown Plant",
      currentStepTemplate: template,
      stepNumber,
      totalSteps: steps.length,
    };
  });

  // Filter assignments that need approval
  const pendingApprovals = assignmentsWithDetails.filter(
    a => a.status === "active" && 
        a.currentStepId !== null && 
        chainStepsResults
          .flat()
          .find(s => s.id === a.currentStepId)?.requiresApproval
  );

  return (
    <div className="space-y-4">
      {pendingApprovals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Pending Approvals ({pendingApprovals.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingApprovals.map((assignment) => (
              <Card
                key={assignment.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{assignment.plantName}</span>
                      </div>
                      {assignment.currentStepTemplate && (
                        <div className="flex items-center gap-2 mt-2">
                          <ListOrdered className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="font-medium">{assignment.currentStepTemplate.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Step {assignment.stepNumber} of {assignment.totalSteps}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Started {format(new Date(assignment.startedAt || new Date()), "PP")}
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedAssignment(assignment.id)}
                      variant="secondary"
                      size="sm"
                      className="font-medium"
                    >
                      Review Step
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedAssignment && (
        <ChainAssignmentDetails
          assignmentId={selectedAssignment}
        />
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-medium">All Assignments ({assignmentsWithPlants.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {assignmentsWithPlants.map((assignment) => (
            <Card
              key={assignment.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedAssignment(assignment.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{assignment.plantName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Started {format(new Date(assignment.startedAt || new Date()), "PP")}
                    </div>
                  </div>
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}