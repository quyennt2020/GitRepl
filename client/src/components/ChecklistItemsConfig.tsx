
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChecklistItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChecklistItemsConfigProps {
  templateId: number;
  setLocalItems: (items: Array<{text: string, required: boolean, order: number}>) => void;
}

export default function ChecklistItemsConfig({ templateId, setLocalItems }: ChecklistItemsConfigProps) {
  const [internalItems, setInternalItems] = useState<ChecklistItem[]>([]);

  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
  });

  const { mutate: deleteChecklistItem } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/checklist-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-templates/${templateId}/checklist`] });
    },
  });

  useEffect(() => {
    setInternalItems(checklistItems);
    setLocalItems(checklistItems.map(item => ({
      text: item.text,
      required: true,
      order: item.order
    })));
  }, [checklistItems, setLocalItems]);

  const handleAdd = () => {
    const newItem = {
      id: Date.now(),
      templateId,
      text: "",
      order: internalItems.length,
      required: true
    } as ChecklistItem;
    
    setInternalItems(prev => [...prev, newItem]);
    setLocalItems(prev => [...prev, {
      text: newItem.text,
      required: true,
      order: newItem.order
    }]);
  };

  const handleDelete = (index: number) => {
    const item = internalItems[index];
    if (item.id && !isNaN(Number(item.id))) {
      deleteChecklistItem(Number(item.id));
    }
    
    setInternalItems(prev => prev.filter((_, i) => i !== index));
    setLocalItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleTextChange = (index: number, text: string) => {
    setInternalItems(prev => 
      prev.map((item, i) => i === index ? { ...item, text } : item)
    );
    setLocalItems(prev =>
      prev.map((item, i) => i === index ? { ...item, text } : item)
    );
  };

  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto">
      <div className="space-y-2">
        {internalItems.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => handleTextChange(index, e.target.value)}
              placeholder="Enter checklist item"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(index)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button onClick={handleAdd} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}
