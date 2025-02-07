import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { ChevronLeft } from "lucide-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import TaskList from "@/components/TaskList";
import TaskForm from "@/components/TaskForm";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Tasks() {
  const [, params] = useParams<{ id: string }>();
  const plantId = parseInt(params?.id || "0");

  const { data: plant, isLoading } = useQuery<Plant>({
    queryKey: [`/api/plants/${plantId}`],
    enabled: !!plantId,
  });

  if (isLoading) {
    return <div className="animate-pulse p-4">
      <div className="h-6 bg-muted rounded w-1/3 mb-4" />
      <div className="space-y-4">
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    </div>;
  }

  if (!plant) {
    return (
      <div className="p-4">
        <Card className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Plant Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The plant you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/plants">
            <Button>Go Back to Plants</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-10">
        <Link href={`/plants/${plantId}`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {plant.name} ({plant.species})
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <TaskForm plantId={plantId} />
        <ScrollArea className="h-[calc(100vh-11rem)]">
          <TaskList plantId={plantId} />
        </ScrollArea>
      </div>
    </div>
  );
}