import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChainStep, TaskTemplate } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  assignmentId: number;
  currentStepId: number | null;
}

export default function PendingApprovals({ assignmentId, currentStepId }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current step that needs approval
  const { data: currentStep, isLoading: isLoadingStep } = useQuery<ChainStep>({
    queryKey: ["/api/chain-steps", currentStepId],
    queryFn: async () => {
      if (!currentStepId) throw new Error("No current step ID");
      const response = await fetch(`/api/chain-steps/${currentStepId}`);
      if (!response.ok) throw new Error("Failed to fetch step");
      return response.json();
    },
    enabled: !!currentStepId,
  });

  // Get template details
  const { data: template, isLoading: isLoadingTemplate } = useQuery<TaskTemplate>({
    queryKey: ["/api/task-templates", currentStep?.templateId],
    queryFn: async () => {
      if (!currentStep?.templateId) throw new Error("No template ID");
      const response = await fetch(`/api/task-templates/${currentStep.templateId}`);
      if (!response.ok) throw new Error("Failed to fetch template");
      return response.json();
    },
    enabled: !!currentStep?.templateId,
  });

  // Approve step mutation
  const approveMutation = useMutation({
    mutationFn: async ({ approved }: { approved: boolean }) => {
      if (!currentStepId) throw new Error("No current step ID");
      
      const response = await fetch(`/api/chain-assignments/${assignmentId}/steps/${currentStepId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          approved, 
          notes: approvalNotes,
          approvedBy: 1 // Using 1 as a placeholder for the current user ID
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit approval decision");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chain-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
      toast({
        title: "Approval submitted",
        description: "The chain has been updated based on your decision.",
      });
      setIsDialogOpen(false);
      setApprovalNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error submitting approval",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  if (isLoadingStep || isLoadingTemplate || !currentStep?.requiresApproval) {
    return null;
  }

  return (
    <>
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-medium">{template?.name || "Current Step"}</h3>
                <p className="text-sm text-amber-700">
                  This step requires your approval before proceeding
                </p>
                {template?.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="text-primary border-primary"
              onClick={() => setIsDialogOpen(true)}
            >
              Review & Approve
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Step Approval
            </DialogTitle>
            <DialogDescription>
              Review the step completion and provide your approval decision
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Step Details</h3>
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium">{template?.name}</h4>
                {template?.description && (
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Approval Notes</h3>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about your decision..."
                rows={4}
                disabled={approveMutation.isPending}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => approveMutation.mutate({ approved: false })}
                disabled={approveMutation.isPending}
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {approveMutation.isPending ? "Rejecting..." : "Reject"}
              </Button>
              <Button
                onClick={() => approveMutation.mutate({ approved: true })}
                disabled={approveMutation.isPending}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {approveMutation.isPending ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}