import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraInputProps {
  onCapture: (imageUrl: string) => void;
}

export default function CameraInput({ onCapture }: CameraInputProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please try using file upload instead.",
        variant: "destructive"
      });
    }
  }

  function capturePhoto() {
    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not get canvas context");

        // Draw the video frame to canvas
        context.drawImage(video, 0, 0);

        // Convert to JPEG with 0.8 quality
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Stop the camera stream
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCapturing(false);

        // Pass the image data to parent
        onCapture(imageUrl);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast({
        title: "Capture Error",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive"
      });
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Pass the image data to parent
          onCapture(reader.result);
        }
      };

      reader.onerror = () => {
        toast({
          title: "Upload Error",
          description: "Failed to read image file. Please try again.",
          variant: "destructive"
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="space-y-4">
      {isCapturing ? (
        <div className="space-y-4">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            className="w-full rounded-lg"
          />
          <Button 
            onClick={capturePhoto}
            className="w-full"
          >
            Take Photo
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button 
            onClick={startCamera}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            Open Camera
          </Button>
          <div className="relative">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload from Gallery
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}