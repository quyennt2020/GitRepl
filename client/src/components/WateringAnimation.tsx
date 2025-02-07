import { motion } from "framer-motion";
import { Droplets } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface WateringAnimationProps {
  lastWatered: Date;
  wateringInterval: number;
}

export default function WateringAnimation({ lastWatered, wateringInterval }: WateringAnimationProps) {
  const daysSinceWatered = differenceInDays(new Date(), new Date(lastWatered));
  const progress = Math.min((daysSinceWatered / wateringInterval) * 100, 100);
  const isWateringDue = daysSinceWatered >= wateringInterval;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <motion.div
        animate={{
          scale: isWateringDue ? [1, 1.1, 1] : 1,
          opacity: isWateringDue ? [0.8, 1, 0.8] : 0.8,
        }}
        transition={{
          duration: 2,
          repeat: isWateringDue ? Infinity : 0,
          repeatType: "reverse",
        }}
        className="relative"
      >
        <Droplets 
          className={`w-8 h-8 ${isWateringDue ? 'text-blue-500' : 'text-muted-foreground'}`}
        />
        {isWateringDue && (
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500 opacity-20"
            animate={{
              scale: [1, 1.5],
              opacity: [0.2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        )}
      </motion.div>
      
      <div className="w-full space-y-1">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-center text-muted-foreground">
          {isWateringDue ? (
            <span className="text-blue-500 font-medium">Watering due!</span>
          ) : (
            `${wateringInterval - daysSinceWatered} days until next watering`
          )}
        </p>
      </div>
    </div>
  );
}
