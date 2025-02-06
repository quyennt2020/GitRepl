import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageInputProps {
  defaultImage?: string;
  onImageSelect: (imageUrl: string) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageInput({ defaultImage, onImageSelect }: ImageInputProps) {
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
        const maxDimension = 1280;
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

        // Try different compression levels until we get a small enough size
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > MAX_IMAGE_SIZE && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > MAX_IMAGE_SIZE) {
          reject(new Error('Unable to compress image enough'));
          return;
        }

        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE * 2) {
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
          description: "Please try a smaller image",
          variant: "destructive",
        });
      }
    }
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

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        <ImageIcon className="w-4 h-4 mr-2" />
        Choose from Gallery
      </Button>

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