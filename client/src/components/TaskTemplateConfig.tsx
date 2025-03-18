import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TaskTemplate } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TaskTemplateForm from "./TaskTemplateForm";
import TaskTemplateList from "./TaskTemplateList";

export default function TaskTemplateConfig() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Task Templates</h2>
        <Button onClick={() => {
          setEditingTemplate(null);
          setIsDialogOpen(true);
        }}>
          New Template
        </Button>
      </div>

      <TaskTemplateList 
        templates={templates || []} 
        onEdit={(template) => {
          setEditingTemplate(template);
          setIsDialogOpen(true);
        }}
      />

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplate(null);
          }
          setIsDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Task Template" : "New Task Template"}
            </DialogTitle>
          </DialogHeader>
          <TaskTemplateForm
            editingTemplate={editingTemplate}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}