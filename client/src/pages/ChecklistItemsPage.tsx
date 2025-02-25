import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChecklistItem, TaskTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";

export default function ChecklistItemsPage() {
  const [_, params] = useLocation();
  const templateId = parseInt(params.split('/').pop() || '0');
  const [items, setItems] = useState<Array<{text: string, id?: number, order: number}>>([]);
  const { toast } = useToast();

  const { data: template } = useQuery<TaskTemplate>({
    queryKey: [`/api/task-templates/${templateId}`],
    enabled: templateId > 0,
  });

  const { data: checklistItems = [], isLoading } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
    enabled: templateId > 0,
  });

  const { mutate: saveItems } = useMutation({
    mutationFn: async () => {
      // Delete existing items
      const currentItems = checklistItems || [];
      for (const item of currentItems) {
        await apiRequest("DELETE", `/api/checklist-items/${item.id}`);
      }

      // Create new items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.text.trim()) {
          await apiRequest("POST", "/api/checklist-items", {
            templateId,
            text: item.text,
            required: true,
            order: i
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-templates/${templateId}/checklist`] });
      toast({ title: "Checklist items saved successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to save checklist items",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (checklistItems?.length >= 0) {
      const sortedItems = [...checklistItems].sort((a, b) => a.order - b.order);
      setItems(sortedItems.map(item => ({
        text: item.text,
        id: item.id,
        order: item.order
      })));
    }
  }, [checklistItems]);

  const handleAdd = () => {
    const newOrder = items.length;
    setItems([...items, { text: "", order: newOrder }]);
  };

  const handleDelete = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, order: i }));
    setItems(updatedItems);
  };

  const handleTextChange = (index: number, text: string) => {
    const updatedItems = items.map((item, i) => 
      i === index ? { ...item, text } : item
    );
    setItems(updatedItems);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">
          Checklist Items for {template?.name}
        </h1>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            {items.map((item, index) => (
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

          <Button onClick={() => saveItems()} className="w-full">
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
