import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskChain, Plant } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  open: boolean;
  onClose: () => void;
  plantId: number;
}

export default function AssignChainDialog({ open, onClose, plantId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChainId, setSelectedChainId] = useState<string>("");

  const { data: chains = [] } = useQuery<TaskChain[]>({
    queryKey: ["/api/task-chains"],
    staleTime: 0,
  });

  const { data: plant } = useQuery<Plant>({
    queryKey: ["/api/plants", plantId],
    enabled: !!plantId,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/chain-assignments", {
        method: "POST",
        body: JSON.stringify({
          chainId: Number(selectedChainId),
          plantId,
          status: "active",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign chain");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chain-assignments"] });
      toast({
        title: "Chain assigned successfully",
        description: `Task chain has been assigned to ${plant?.name}`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error assigning chain",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!selectedChainId) {
      toast({
        title: "Please select a chain",
        description: "You must select a task chain to assign",
        variant: "destructive",
      });
      return;
    }
    assignMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Task Chain</DialogTitle>
          <DialogDescription>
            Select a task chain to assign to {plant?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Task Chain</label>
            <Select
              value={selectedChainId}
              onValueChange={setSelectedChainId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task chain" />
              </SelectTrigger>
              <SelectContent>
                {chains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id.toString()}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedChainId || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Chain"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
