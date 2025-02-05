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

  function compressImage(canvas: HTMLCanvasElement, maxWidth = 800): string {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Scale down if wider than maxWidth
    const ratio = maxWidth / canvas.width;
    if (ratio < 1) {
      const newWidth = canvas.width * ratio;
      const newHeight = canvas.height * ratio;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = newWidth;
      tempCanvas.height = newHeight;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        return tempCanvas.toDataURL('image/jpeg', 0.6);
      }
    }

    return canvas.toDataURL('image/jpeg', 0.6);
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
          const compressedImage = compressImage(canvas);
          console.log('Captured and compressed photo, size:', compressedImage.length);
          onCapture(compressedImage);
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

  async function compressFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 800;
          const ratio = maxWidth / img.width;

          if (ratio < 1) {
            canvas.width = maxWidth;
            canvas.height = img.height * ratio;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          } else {
            reject(new Error('Could not get canvas context'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit before compression
        alert('Please choose an image smaller than 10MB');
        return;
      }

      try {
        const compressedImage = await compressFile(file);
        console.log('Compressed file, size:', compressedImage.length);
        onCapture(compressedImage);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Failed to process image. Please try another one.');
      }
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