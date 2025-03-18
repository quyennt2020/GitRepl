
import { TaskTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskTemplateListProps {
  templates: TaskTemplate[];
  onEdit: (template: TaskTemplate) => void;
}

export default function TaskTemplateList({ templates, onEdit }: TaskTemplateListProps) {
  return (
    <div className="grid gap-4">
      {templates.map((template) => (
        <div key={template.id} className="p-4 rounded-lg border">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{template.name}</h3>
              <p className="text-sm text-muted-foreground">{template.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{template.category}</Badge>
                <Badge variant="outline">{template.priority} priority</Badge>
                <Badge variant="outline">{template.isOneTime ? "One-time task" : `${template.defaultInterval} days interval`}</Badge>
                {template.public && <Badge variant="outline">Public</Badge>}
                {template.applyToAll && <Badge variant="outline">Apply to all</Badge>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(template)}
            >
              Edit
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
