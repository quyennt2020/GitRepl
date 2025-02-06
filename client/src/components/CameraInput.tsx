import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraInputProps {
  onCapture: (imageUrl: string) => void;
}

export default function CameraInput({ onCapture }: CameraInputProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  async function startCamera() {
    try {
      // Try environment-facing camera first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { exact: "environment" },
            width: { ideal: 800 },
            height: { ideal: 800 }
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play(); // Ensure video starts playing
          setIsCapturing(true);
        }
      } catch {
        // If environment camera fails, try any available camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 800 },
            height: { ideal: 800 }
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play(); // Ensure video starts playing
          setIsCapturing(true);
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check camera permissions or try using the gallery option.",
        variant: "destructive",
      });
    }
  }

  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video dimensions
      const maxDimension = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, width, height);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.7);
        onCapture(imageUrl);

        // Stop the camera stream
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setIsCapturing(false);
      }
    }
  }

  return (
    <div className="space-y-4">
      {isCapturing ? (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            muted // Required for autoplay on mobile
            className="w-full h-64 object-cover rounded-lg"
          />
          <Button 
            onClick={capturePhoto}
            className="w-full"
          >
            Take Photo
          </Button>
        </>
      ) : (
        <Button 
          onClick={startCamera}
          className="w-full"
        >
          <Camera className="w-4 h-4 mr-2" />
          Open Camera
        </Button>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}