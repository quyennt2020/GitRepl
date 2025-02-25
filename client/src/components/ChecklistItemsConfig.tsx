import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChecklistItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ChecklistItemsConfigProps {
  templateId: number;
  setLocalItems: (items: Array<{text: string, required: boolean, order: number}>) => void;
}

export default function ChecklistItemsConfig({ templateId, setLocalItems }: ChecklistItemsConfigProps) {
  const [internalItems, setInternalItems] = useState<ChecklistItem[]>([]);

  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
  });

  useEffect(() => {
    if (checklistItems.length > 0) {
      setInternalItems(checklistItems);
      setLocalItems(checklistItems.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
    }
  }, [checklistItems, setLocalItems]);

  const handleAdd = () => {
    const newItem = {
      templateId,
      text: "",
      order: internalItems.length,
    };
    const newInternalItems = [...internalItems, { ...newItem, id: Date.now() } as ChecklistItem];
    setInternalItems(newInternalItems);
    setLocalItems(newInternalItems.map(item => ({
      text: item.text,
      required: true,
      order: item.order
    })));
  };

  const handleDelete = (index: number) => {
    setInternalItems(items => {
      const newItems = items.filter((_, i) => i !== index);
      setLocalItems(newItems.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
      return newItems;
    });
  };

  const handleTextChange = (index: number, text: string) => {
    setInternalItems(items => {
      const newItems = items.map((item, i) => (i === index ? { ...item, text } : item));
      setLocalItems(newItems.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
      return newItems;
    });
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