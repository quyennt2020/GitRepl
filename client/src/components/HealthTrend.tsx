import { useQuery } from "@tanstack/react-query";
import { HealthRecord } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HealthTrendProps {
  plantId: number;
}

export default function HealthTrend({ plantId }: HealthTrendProps) {
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
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[1, 5]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="healthScore"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}