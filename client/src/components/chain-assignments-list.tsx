import { useQuery } from "@tanstack/react-query";
import { ChainAssignment, Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sprout, Shield } from "lucide-react";
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

  if (isLoadingAssignments || isLoadingPlants) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Combine assignment data with plant information
  const assignmentsWithPlants = assignments.map(assignment => {
    const plant = plants.find(p => p.id === assignment.plantId);
    return {
      ...assignment,
      plantName: plant?.name ?? "Unknown Plant",
    };
  });

  // Filter assignments that need approval
  const pendingApprovals = assignmentsWithPlants.filter(
    a => a.status === "active" && a.currentStepId !== null
  );

  // Log assignments data for debugging
  console.log('All assignments:', assignmentsWithPlants);
  console.log('Pending approvals:', pendingApprovals);

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
                    <Badge variant="outline">Needs Approval</Badge>
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