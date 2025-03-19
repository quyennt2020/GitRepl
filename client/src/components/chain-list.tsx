import { TaskChain } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { mockTaskChains } from "@/lib/mock-data";

interface ChainListProps {
  chains: TaskChain[];
  onEdit: (chain: TaskChain) => void;
}

export default function ChainList({ chains, onEdit }: ChainListProps) {
  const { toast } = useToast();

  const deleteChainMutation = useMutation({
    mutationFn: async (chainId: number) => {
      console.log("Mock deleting chain:", chainId);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      // Filter out the deleted chain from mock data
      const updatedChains = mockTaskChains.filter(chain => chain.id !== chainId);
      return updatedChains;
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
    <div className="space-y-2">
      {chains.map((chain) => (
        <Card key={chain.id} className="flex flex-col hover:bg-muted/50">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{chain.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(chain)}
                  className="h-8 w-8"
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {chain.description}
              </p>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-xs">
                  {chain.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
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