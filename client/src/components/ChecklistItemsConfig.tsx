
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChecklistItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ChecklistItemsConfig({ templateId }: { templateId: number }) {
  const [localItems, setLocalItems] = useState<ChecklistItem[]>([]);

  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
  });

  useEffect(() => {
    if (checklistItems.length > 0) {
      setLocalItems(checklistItems);
    }
  }, [checklistItems]);

  const handleAdd = () => {
    const newItem = {
      templateId,
      text: "",
      order: localItems.length,
    };
    setLocalItems([...localItems, { ...newItem, id: Date.now() } as ChecklistItem]);
  };

  const handleDelete = (index: number) => {
    setLocalItems(items => items.filter((_, i) => i !== index));
  };

  const handleTextChange = (index: number, text: string) => {
    setLocalItems(items =>
      items.map((item, i) => (i === index ? { ...item, text } : item))
    );
  };

  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto">
      <div className="space-y-2">
        {localItems.map((item, index) => (
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
