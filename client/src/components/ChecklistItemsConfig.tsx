import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChecklistItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface ChecklistItemsConfigProps {
  templateId: number;
  setLocalItems: (items: Array<{text: string, required: boolean, order: number}>) => void;
}

export default function ChecklistItemsConfig({ templateId, setLocalItems }: ChecklistItemsConfigProps) {
  const [internalItems, setInternalItems] = useState<Array<{text: string, id?: number, order: number}>>([]);

  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
    enabled: templateId > 0,
  });

  useEffect(() => {
    if (checklistItems?.length >= 0) {
      const sortedItems = [...checklistItems].sort((a, b) => a.order - b.order);
      setInternalItems(sortedItems.map(item => ({
        text: item.text,
        id: item.id,
        order: item.order
      })));
      setLocalItems(sortedItems.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
    }
  }, [checklistItems, setLocalItems]);

  const handleAdd = () => {
    try {
      const newOrder = internalItems.length;
      const newItem = {
        text: "",
        order: newOrder
      };

      const updatedItems = [...internalItems, newItem];
      setInternalItems(updatedItems);
      setLocalItems(updatedItems.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
    } catch (error) {
      console.error("Error adding checklist item:", error);
    }
  };

  const handleDelete = (index: number) => {
    try {
      const updatedItems = internalItems.filter((_, i) => i !== index);

      // Reorder remaining items
      const reorderedItems = updatedItems.map((item, i) => ({
        ...item,
        order: i
      }));

      setInternalItems(reorderedItems);
      setLocalItems(reorderedItems.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  const handleTextChange = (index: number, text: string) => {
    try {
      const updatedItems = internalItems.map((item, i) => 
        i === index ? { ...item, text } : item
      );
      setInternalItems(updatedItems);
      setLocalItems(updatedItems.map(item => ({
        text: item.text,
        required: true,
        order: item.order
      })));
    } catch (error) {
      console.error("Error updating checklist item text:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Checklist Items</h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {internalItems.map((item, index) => (
          <div key={item.id || index} className="flex items-center gap-2">
            <Input
              value={item.text || ""}
              onChange={(e) => handleTextChange(index, e.target.value)}
              placeholder="Enter checklist item"
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
      <Button onClick={handleAdd} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}