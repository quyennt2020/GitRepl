import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChecklistItem } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: number;
  onComplete: (checklistProgress: Record<string, boolean>) => void;
}

export default function TaskCompletionDialog({
  open,
  onOpenChange,
  templateId,
  onComplete,
}: TaskCompletionDialogProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  const { data: checklistItems, isLoading } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/task-templates/${templateId}/checklist`],
    enabled: open,
  });

  const handleComplete = () => {
    onComplete(checkedItems);
    onOpenChange(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Task Completion</DialogTitle>
          <DialogDescription>
            Please check off each item to confirm the task is properly completed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {checklistItems?.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                id={`item-${item.id}`}
                checked={checkedItems[item.id] || false}
                onCheckedChange={(checked) => {
                  setCheckedItems(prev => ({
                    ...prev,
                    [item.id]: checked as boolean
                  }));
                }}
              />
              <label
                htmlFor={`item-${item.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {item.text}
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={!checklistItems?.every(item => 
              !item.required || checkedItems[item.id]
            )}
          >
            Complete Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
