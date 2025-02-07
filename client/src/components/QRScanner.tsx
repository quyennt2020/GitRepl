import { useState } from "react";
import QrScanner from "react-qr-scanner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { QrCode, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      const url = new URL(data.text);
      const pathParts = url.pathname.split('/');
      const plantId = pathParts[pathParts.indexOf('plants') + 1];
      
      if (plantId) {
        setLocation(`/plants/${plantId}`);
        setIsOpen(false);
      }
    }
  };

  const handleError = (err: any) => {
    console.error(err);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full flex gap-2">
          <QrCode className="h-4 w-4" />
          Scan Plant QR Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Plant QR Code</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <QrScanner
            onError={handleError}
            onScan={handleScan}
            style={{ width: '100%' }}
            constraints={{
              video: { facingMode: "environment" }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Position the QR code within the camera view to scan
        </p>
      </DialogContent>
    </Dialog>
  );
}
