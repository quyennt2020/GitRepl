import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChainStep, TaskTemplate } from "@shared/schema";
import { Shield, CheckCircle2, XCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface Props {
  open: boolean;
  onClose: () => void;
  step: ChainStep;
  assignmentId: number;
}

export default function StepApprovalDialog({ open, onClose, step, assignmentId }: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");

  // Get template information for the step
  const { data: template, isLoading: isLoadingTemplate } = useQuery<TaskTemplate>({
    queryKey: ["/api/task-templates", step.templateId],
    enabled: !!step.templateId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ approved, notes, assignmentId, stepId, approvedBy }: { approved: boolean; notes: string | null; assignmentId: number; stepId: number; approvedBy: number | null }) => {
      const response = await fetch(`/api/chain-assignments/${assignmentId}/steps/${stepId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, notes, approvedBy }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit approval decision");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chain-assignments"] });
      toast({
        title: "Approval decision submitted",
        description: "The task chain has been updated.",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Approval error:", error);
      toast({
        title: "Error submitting approval",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (approved: boolean) => {
    if (!notes.trim() && !approved) {
      toast({
        title: "Notes required",
        description: "Please provide a reason for rejecting the step",
        variant: "destructive",
      });
      return;
    }

    // Assuming we have a logged-in user with ID 1 for testing.  Replace with actual user ID retrieval.
    approveMutation.mutate({ 
      assignmentId,
      stepId: step.id,
      approvedBy: approved ? 1 : null,
      notes: notes.trim() || null,
      approved
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Step Approval Required
          </DialogTitle>
          <DialogDescription>
            Review the step completion and provide your approval decision
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Step Details</h3>
            {isLoadingTemplate ? (
              <div className="text-sm text-muted-foreground">Loading template details...</div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>{template?.name}</p>
                {template?.description && (
                  <p className="mt-1">{template.description}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Approval Notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your decision..."
              rows={4}
              disabled={approveMutation.isPending}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={approveMutation.isPending}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {approveMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
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
  );
}