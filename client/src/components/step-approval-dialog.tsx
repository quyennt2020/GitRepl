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
  const { data: template } = useQuery<TaskTemplate>({
    queryKey: ["/api/task-templates", step.templateId],
    enabled: !!step.templateId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ approved, notes }: { approved: boolean; notes: string }) => {
      const response = await fetch(`/api/chain-assignments/${assignmentId}/steps/${step.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, notes }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit approval decision");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chain-assignments"] });
      toast({
        title: "Approval decision submitted",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error submitting approval",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (approved: boolean) => {
    approveMutation.mutate({ approved, notes });
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
            <div className="text-sm text-muted-foreground">
              <p>{template?.name}</p>
              {template?.description && (
                <p className="mt-1">{template.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Approval Notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your decision..."
              rows={4}
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
              Reject
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={approveMutation.isPending}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}