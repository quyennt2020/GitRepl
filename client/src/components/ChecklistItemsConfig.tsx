
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChecklistItem, TaskTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChecklistItemsConfig({ templateId }: { templateId: number }) {
  const { toast } = useToast();
  const [localItems, setLocalItems] = useState<ChecklistItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
    onSuccess: (data) => {
      if (!hasChanges) {
        setLocalItems(data);
      }
    },
  });

  const { mutate: addItem } = useMutation({
    mutationFn: async () => {
      const newItem = {
        templateId,
        text: "New item",
        order: localItems.length,
      };
      setLocalItems([...localItems, { ...newItem, id: Date.now() } as ChecklistItem]);
      setHasChanges(true);
    },
  });

  const { mutate: saveChanges } = useMutation({
    mutationFn: async () => {
      // Delete removed items
      const deletedItems = checklistItems.filter(item => 
        !localItems.find(local => local.id === item.id)
      );
      
      for (const item of deletedItems) {
        await apiRequest("DELETE", `/api/checklist-items/${item.id}`);
      }

      // Add/Update items
      for (const item of localItems) {
        if (!item.id || item.id > 1000000) { // New item
          await apiRequest("POST", "/api/checklist-items", {
            templateId,
            text: item.text,
            order: item.order,
          });
        } else { // Existing item
          await apiRequest("PATCH", `/api/checklist-items/${item.id}`, { text: item.text });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-templates/${templateId}/checklist`] });
      setHasChanges(false);
      toast({ title: "Changes saved successfully" });
    },
  });

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Checklist Items</h3>
          <div className="space-x-2">
            {hasChanges && (
              <Button onClick={() => saveChanges()}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
            <Button onClick={() => addItem()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {localItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.text}
                onChange={(e) => {
                  const newItems = [...localItems];
                  newItems[index] = { ...item, text: e.target.value };
                  setLocalItems(newItems);
                  setHasChanges(true);
                }}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setLocalItems(localItems.filter((_, i) => i !== index));
                  setHasChanges(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
