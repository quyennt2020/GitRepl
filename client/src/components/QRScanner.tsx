import { useState } from "react";
import QrScanner from "react-qr-scanner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { QrCode, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Add type declaration for react-qr-scanner
declare module 'react-qr-scanner' {
  export interface QrScannerProps {
    onError: (error: Error) => void;
    onScan: (result: { text: string } | null) => void;
    style?: React.CSSProperties;
    constraints?: MediaTrackConstraints;
  }

  const QrScanner: React.FC<QrScannerProps>;
  export default QrScanner;
}

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      try {
        const url = new URL(data.text);
        const pathParts = url.pathname.split('/');
        const plantIndex = pathParts.indexOf('plants');

        if (plantIndex === -1) {
          throw new Error('Invalid QR code: Not a plant URL');
        }

        const plantId = pathParts[plantIndex + 1];
        if (!plantId) {
          throw new Error('Invalid QR code: No plant ID found');
        }

        setLocation(`/plants/${plantId}`);
        setIsOpen(false);
      } catch (error) {
        toast({
          title: "Invalid QR Code",
          description: error instanceof Error ? error.message : "The QR code is not in the correct format",
          variant: "destructive",
        });
      }
    }
  };

  const handleError = (err: Error) => {
    console.error(err);
    toast({
      title: "Scanner Error",
      description: "Failed to access camera. Please check your permissions.",
      variant: "destructive",
    });
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