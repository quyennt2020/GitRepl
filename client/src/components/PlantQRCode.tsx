import { QRCodeSVG } from "qrcode.react";
import { Plant } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

interface PlantQRCodeProps {
  plant: Plant;
}

export default function PlantQRCode({ plant }: PlantQRCodeProps) {
  // Create a minimal plant identifier with just static information
  const plantIdentifier = {
    id: plant.id,
    name: plant.name,
  };

  // Generate a URL that can be used to directly access the plant's details
  const baseUrl = window.location.origin;
  const plantUrl = `${baseUrl}/plants/${plant.id}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plant Identification QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-4">
          <QRCodeSVG
            value={plantUrl}
            size={200}
            level="H"
            includeMargin
            className="bg-white p-2 rounded-lg"
          />
          <div className="text-sm space-y-2">
            <p className="font-medium text-center">{plant.name}</p>
            <p className="text-muted-foreground text-center">Print and attach this QR code to your plant for easy identification and care tracking.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}