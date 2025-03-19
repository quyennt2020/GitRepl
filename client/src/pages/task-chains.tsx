import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TaskChain } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ChainBuilder from "@/components/chain-builder";
import ChainList from "@/components/chain-list";
import { useToast } from "@/hooks/use-toast";

export default function TaskChainsPage() {
  const { toast } = useToast();
  const [editingChain, setEditingChain] = useState<TaskChain | undefined>();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const { data: chains, isLoading, error } = useQuery<TaskChain[]>({
    queryKey: ["/api/task-chains"],
    onError: (error: Error) => {
      console.error("Failed to fetch task chains:", error);
      toast({
        title: "Error loading task chains",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6 space-y-4">
        <h1 className="text-3xl font-bold">Task Chains</h1>
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Failed to load task chains. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Task Chains</h1>
        <Button onClick={() => setIsBuilderOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Chain
        </Button>
      </div>

      <ChainList
        chains={chains || []}
        onEdit={(chain) => {
          console.log("Editing chain:", chain);
          setEditingChain(chain);
          setIsBuilderOpen(true);
        }}
      />

      <ChainBuilder
        open={isBuilderOpen}
        onClose={() => {
          console.log("Closing chain builder");
          setIsBuilderOpen(false);
          setEditingChain(undefined);
        }}
        existingChain={editingChain}
      />
    </div>
  );
}