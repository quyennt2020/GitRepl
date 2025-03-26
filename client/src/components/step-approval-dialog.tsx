import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChainStep, TaskTemplate } from "@shared/schema";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
  step: ChainStep;
  assignmentId: number;
}

export default function StepApprovalDialog({ open, onClose, step, assignmentId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  // Get template information for the step
  const { data: template, isLoading: isLoadingTemplate } = useQuery<TaskTemplate>({
    queryKey: ["/api/task-templates", step.templateId],
    enabled: !!step.templateId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ approved }: { approved: boolean }) => {
      const response = await fetch(`/api/chain-assignments/${assignmentId}/steps/${step.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          approved, 
          notes: notes || null,
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-amber-500" />
            Review and Approve Step
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{template?.name}</h3>
            <p className="text-gray-600">{template?.description}</p>
          </div>

          <div className="space-y-3">
            <label className="font-medium block">Approval Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your decision..."
              rows={5}
              className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={approveMutation.isPending}
            />
            <p className="text-sm text-gray-500">
              Add any observations or reasons for your approval decision.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => approveMutation.mutate({ approved: false })}
              disabled={approveMutation.isPending}
              className="border-red-500 text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {approveMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
            <Button
              onClick={() => approveMutation.mutate({ approved: true })}
              disabled={approveMutation.isPending}
              className="bg-green-500 hover:bg-green-600 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}