import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TaskChain } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ChainBuilder from "@/components/chain-builder";
import ChainList from "@/components/chain-list";

export default function TaskChainsPage() {
  const [editingChain, setEditingChain] = useState<TaskChain | undefined>();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const { data: chains, isLoading } = useQuery<TaskChain[]>({
    queryKey: ["/api/task-chains"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
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
