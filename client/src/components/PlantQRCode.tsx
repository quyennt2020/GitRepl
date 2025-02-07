import { QRCodeSVG } from "qrcode.react";
import { Plant } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { differenceInDays } from "date-fns";

interface PlantQRCodeProps {
  plant: Plant;
}

export default function PlantQRCode({ plant }: PlantQRCodeProps) {
  const lastWateredDate = plant.lastWatered ? new Date(plant.lastWatered) : new Date();
  const daysSinceWatered = differenceInDays(new Date(), lastWateredDate);
  const needsWatering = daysSinceWatered >= plant.wateringInterval;

  // Create a plant care info object with essential details
  const plantCareInfo = {
    id: plant.id,
    name: plant.name,
    species: plant.species,
    location: plant.location,
    wateringSchedule: {
      interval: plant.wateringInterval,
      lastWatered: lastWateredDate.toISOString(),
      needsWatering,
      daysUntilNextWatering: Math.max(plant.wateringInterval - daysSinceWatered, 0)
    },
    fertilizingSchedule: {
      interval: plant.fertilizingInterval,
      lastFertilized: plant.lastFertilized ? new Date(plant.lastFertilized).toISOString() : null
    }
  };

  // Convert plant info to a JSON string for the QR code
  const qrValue = JSON.stringify(plantCareInfo);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plant Care QR Code - {plant.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-4">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin
            className="bg-white p-2 rounded-lg"
          />
          <div className="text-sm space-y-2">
            <p className="font-medium">Scan to check:</p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Watering schedule</li>
              <li>Last watered date</li>
              <li>Care instructions</li>
              <li>Plant location</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}