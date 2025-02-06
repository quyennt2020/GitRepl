import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraInputProps {
  onCapture: (imageUrl: string) => void;
  onCancel: () => void;
}

export default function CameraInput({ onCapture, onCancel }: CameraInputProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  async function startCamera() {
    try {
      let mediaStream: MediaStream;

      // First try to get the environment-facing camera
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (err) {
        // If environment camera fails, try any available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        try {
          await videoRef.current.play();
          setIsCapturing(true);
        } catch (playError) {
          console.error("Error playing video:", playError);
          toast({
            title: "Camera Error",
            description: "Failed to start video stream. Please try again.",
            variant: "destructive",
          });
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

        // Stop all tracks and clean up
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setIsCapturing(false);
        onCapture(imageUrl);
      }
    }
  }

  return (
    <div className="space-y-4">
      {isCapturing ? (
        <div className="relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            muted
            className="w-full aspect-video object-cover rounded-lg bg-muted"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button 
              variant="secondary"
              onClick={() => {
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                }
                setStream(null);
                setIsCapturing(false);
                onCancel();
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={capturePhoto}>
              Take Photo
            </Button>
          </div>
        </div>
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