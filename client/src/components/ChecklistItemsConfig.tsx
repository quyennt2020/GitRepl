import { useState } from "react";
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
    onSuccess: (data) => {
      setLocalItems(data);
    },
  });

  const handleAdd = () => {
    const newItem = {
      templateId,
      text: "New item",
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
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Checklist Items</h2>
          <Button onClick={handleAdd} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {localItems.map((item, index) => (
            <div key={item.id || index} className="flex items-center gap-2">
              <Input
                value={item.text}
                onChange={(e) => handleTextChange(index, e.target.value)}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(index)}
                className="text-destructive hover:text-destructive/90"
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