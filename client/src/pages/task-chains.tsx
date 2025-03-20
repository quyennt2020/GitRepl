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

  // Fetch chains with proper caching
  const { data: chains = [], isLoading, error } = useQuery<TaskChain[]>({
    queryKey: ["/api/task-chains"],
    staleTime: 0,
    refetchOnMount: true,
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
      <div className="p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Failed to load task chain templates. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Task Chain Templates</h1>
        <Button 
          onClick={() => {
            setEditingChain(undefined);
            setIsBuilderOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <ChainList
        chains={chains}
        onEdit={(chain) => {
          setEditingChain(chain);
          setIsBuilderOpen(true);
        }}
      />

      <ChainBuilder
        open={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingChain(undefined);
        }}
        existingChain={editingChain}
      />
    </div>
  );
}