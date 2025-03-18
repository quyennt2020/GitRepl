
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
        <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">{template.category}</Badge>
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">{template.priority} priority</Badge>
                <Badge 
                  variant="outline" 
                  className={template.isOneTime 
                    ? "bg-blue-100 text-blue-700 border-blue-300" 
                    : "bg-green-50 text-green-700 border-green-300"
                  }
                >
                  {template.isOneTime ? "⭐ One-time task" : `🔄 ${template.defaultInterval} days interval`}
                </Badge>
                {template.public && <Badge variant="outline" className="border-purple-300">Public</Badge>}
                {template.applyToAll && <Badge variant="outline" className="border-indigo-300">Apply to all</Badge>}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
              className="ml-4 hover:bg-slate-100"
            >
              <span className="mr-1">✏️</span> Edit
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
