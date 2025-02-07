import { QRCodeSVG } from "qrcode.react";
import { Plant } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

interface PlantQRCodeProps {
  plant: Plant;
}

export default function PlantQRCode({ plant }: PlantQRCodeProps) {
  // Create a plant info object with essential details
  const plantInfo = {
    id: plant.id,
    name: plant.name,
    species: plant.species,
    wateringInterval: plant.wateringInterval,
    sunlight: plant.sunlight,
  };

  // Convert plant info to a JSON string for the QR code
  const qrValue = JSON.stringify(plantInfo);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plant QR Code - {plant.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-4">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin
            className="bg-white p-2 rounded-lg"
          />
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to view plant details
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
