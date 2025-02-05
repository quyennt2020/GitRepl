import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import CareTask from "@/components/CareTask";
import { format, addDays } from "date-fns";

export default function Schedule() {
  const { data: plants } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Care Schedule</h1>
      
      {next7Days.map(date => (
        <Card key={date.toISOString()}>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              {format(date, "EEEE, MMM d")}
            </h2>
            <div className="space-y-2">
              {plants?.map(plant => (
                <CareTask key={plant.id} plant={plant} date={date} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
