import { TaskChain } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChainListProps {
  chains: TaskChain[];
  onEdit: (chain: TaskChain) => void;
}

export default function ChainList({ chains, onEdit }: ChainListProps) {
  const { toast } = useToast();

  const deleteChainMutation = useMutation({
    mutationFn: async (chainId: number) => {
      console.log("Deleting chain:", chainId);
      await apiRequest("DELETE", `/api/task-chains/${chainId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-chains"] });
      toast({
        title: "Chain deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to delete chain:", error);
      toast({
        title: "Failed to delete chain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!chains.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No task chains created yet
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {chains.map((chain) => (
        <Card key={chain.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">{chain.name}</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  console.log("Editing chain:", chain);
                  onEdit(chain);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  console.log("Attempting to delete chain:", chain);
                  if (confirm("Are you sure you want to delete this chain?")) {
                    deleteChainMutation.mutate(chain.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {chain.description}
              </p>
              <div className="flex gap-2">
                <Badge variant="outline">{chain.category}</Badge>
                <Badge variant="outline">
                  {chain.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}