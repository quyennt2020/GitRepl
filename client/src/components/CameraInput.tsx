import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image } from "lucide-react";

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
      alert("Could not access camera. Please make sure you've granted camera permissions.");
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
        try {
          const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
          console.log('Captured photo, size:', imageUrl.length);
          onCapture(imageUrl);
        } catch (error) {
          console.error('Error capturing photo:', error);
          alert('Failed to capture photo. Please try again.');
        }

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
      if (file.size > 5 * 1024 * 1024) {
        alert('Please choose an image smaller than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          console.log('Loaded file, size:', result.length);
          onCapture(result);
        } catch (error) {
          console.error('Error processing file:', error);
          alert('Failed to process image. Please try another one.');
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Failed to read image file. Please try another one.');
      };
      reader.readAsDataURL(file);
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
            className="w-full aspect-video rounded-lg bg-muted"
          />
          <Button 
            onClick={capturePhoto}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          <Button 
            onClick={startCamera}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take New Photo
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="w-4 h-4 mr-2" />
            Choose from Gallery
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}