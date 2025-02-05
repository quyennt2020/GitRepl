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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8); // Add quality parameter
        console.log('Captured image URL length:', imageUrl.length);
        onCapture(imageUrl);

        // Stop the camera stream
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
      }
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('File upload result length:', result.length);
        onCapture(result);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
      reader.readAsDataURL(file);
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