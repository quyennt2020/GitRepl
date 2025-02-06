import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon } from "lucide-react";
import CameraInput from "./CameraInput";
import { useToast } from "@/hooks/use-toast";

interface ImageInputProps {
  defaultImage?: string;
  onImageSelect: (imageUrl: string) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageInput({ defaultImage, onImageSelect }: ImageInputProps) {
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        const maxDimension = 1200;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "Image too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      try {
        const resizedImage = await resizeImage(file);
        onImageSelect(resizedImage);
      } catch (error) {
        toast({
          title: "Error processing image",
          description: "Failed to process the selected image",
          variant: "destructive",
        });
      }
    }
  }

  function handleCameraCapture(imageUrl: string) {
    onImageSelect(imageUrl);
    setShowCamera(false);
  }

  return (
    <div className="space-y-4">
      {defaultImage && (
        <img
          src={defaultImage}
          alt="Selected plant"
          className="w-full h-48 object-cover rounded-lg"
        />
      )}

      {showCamera ? (
        <CameraInput onCapture={handleCameraCapture} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCamera(true)}
          >
            <Camera className="w-4 h-4 mr-2" />
            Camera
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Gallery
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}