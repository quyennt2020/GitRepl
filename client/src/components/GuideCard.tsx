import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface GuideCardProps {
  title: string;
  image: string;
  description: string;
}

export default function GuideCard({ title, image, description }: GuideCardProps) {
  return (
    <Card className="overflow-hidden">
      <AspectRatio ratio={16/9}>
        <img 
          src={image} 
          alt={title}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
