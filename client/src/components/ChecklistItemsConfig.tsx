
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChecklistItem, TaskTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChecklistItemsConfig({ templateId }: { templateId: number }) {
  const { toast } = useToast();

  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
  });

  const { mutate: addItem } = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/checklist-items", {
        templateId,
        text: "New item",
        order: checklistItems.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-templates/${templateId}/checklist`] });
      toast({ title: "Checklist item added" });
    },
  });

  const { mutate: updateItem } = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      await apiRequest("PATCH", `/api/checklist-items/${id}`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-templates/${templateId}/checklist`] });
      toast({ title: "Checklist item updated" });
    },
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/checklist-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-templates/${templateId}/checklist`] });
      toast({ title: "Checklist item deleted" });
    },
  });

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Checklist Items</h3>
          <Button onClick={() => addItem()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
        
        {checklistItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => updateItem({ id: item.id, text: e.target.value })}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
