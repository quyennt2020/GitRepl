import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface CameraInputProps {
  onCapture: (imageUrl: string) => void;
}

export default function CameraInput({ onCapture }: CameraInputProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  }

  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg');
        onCapture(imageUrl);
        
        // Stop the camera stream
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
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
            className="w-full rounded-lg"
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
