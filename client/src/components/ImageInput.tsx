import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon } from "lucide-react";
import CameraInput from "./CameraInput";

interface ImageInputProps {
  defaultImage?: string;
  onImageSelect: (imageUrl: string) => void;
}

export default function ImageInput({ defaultImage, onImageSelect }: ImageInputProps) {
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
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
