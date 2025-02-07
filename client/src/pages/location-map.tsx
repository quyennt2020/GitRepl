import { useQuery } from "@tanstack/react-query";
import { Plant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2, Grid, MoreHorizontal, PenLine } from "lucide-react";
import { Link } from "wouter";

export default function LocationMap() {
  const { data: plants, isLoading } = useQuery<Plant[]>({ 
    queryKey: ["/api/plants"]
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-[#F8FAFB]">
        <div className="animate-pulse p-4">
          <div className="h-[400px] bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFB]">
      {/* Top Navigation */}
      <div className="flex items-center gap-2 p-4">
        <Link href="/plants">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 flex justify-end gap-2">
          <Button variant="ghost" size="icon">
            <Grid className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 p-4 overflow-auto">
        <div 
          className="relative w-full aspect-square max-w-lg mx-auto bg-white rounded-lg shadow-sm"
          style={{
            backgroundImage: 'radial-gradient(circle, #E5E7EB 0.5px, transparent 0.5px)',
            backgroundSize: '20px 20px',
            backgroundPosition: '10px 10px'
          }}
        >
          {/* Room Layout */}
          <div className="absolute inset-8 border border-gray-400">
            {/* L-shaped room cutout */}
            <div className="absolute right-0 bottom-0 w-1/3 h-1/3 border-l border-t border-gray-400 bg-white" />
          </div>

          {/* Plant Indicators */}
          {plants?.map((plant, index) => (
            <Link key={plant.id} href={`/plants/${plant.id}`}>
              <a 
                className="absolute w-4 h-4 bg-blue-400 cursor-pointer hover:brightness-110 transition-all"
                style={{
                  // Positioning plants in a symmetric pattern
                  left: `${25 + ((index % 2) * 50)}%`,
                  top: `${25 + (Math.floor(index / 2) * 30)}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                title={plant.name}
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="p-4 border-t bg-white">
        <Button className="w-full gap-2">
          <PenLine className="h-4 w-4" />
          Edit Layout
        </Button>
      </div>
    </div>
  );
}