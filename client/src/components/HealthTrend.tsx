import { useQuery } from "@tanstack/react-query";
import { HealthRecord } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from "lucide-react";
import { useState } from "react";
import HealthRecordForm from "./HealthRecordForm";

interface HealthTrendProps {
  plantId: number;
}

export default function HealthTrend({ plantId }: HealthTrendProps) {
  const [editingRecord, setEditingRecord] = useState<number | null>(null);
  const { data: healthRecords, isLoading } = useQuery<HealthRecord[]>({
    queryKey: [`/api/plants/${plantId}/health`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!healthRecords?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No health records available yet.
        </CardContent>
      </Card>
    );
  }

  const chartData = healthRecords.map(record => ({
    ...record,
    date: format(new Date(record.date), 'MMM d'),
  }));

  // Count issue occurrences
  const issueCount = healthRecords.reduce((acc, record) => {
    (record.issues || []).forEach(issue => {
      acc[issue] = (acc[issue] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Sort issues by frequency
  const commonIssues = Object.entries(issueCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Health Trend</CardTitle>
          {commonIssues.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Common issues:</span>
              {commonIssues.map(([issue, count]) => (
                <Badge key={issue} variant="secondary">
                  {issue.replace('_', ' ')} ({count})
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[200px] md:h-[300px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[1, 5]} />
                <Tooltip />
                <Line
                  type="linear"
                  dataKey="healthScore"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="font-medium">History</h3>
            <div className="space-y-2">
              {healthRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <div className="font-medium">
                      Health Score: {record.healthScore}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(record.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingRecord(record.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Health Record</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {editingRecord && (
              <HealthRecordForm
                plantId={plantId}
                recordId={editingRecord}
                onSuccess={() => setEditingRecord(null)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}