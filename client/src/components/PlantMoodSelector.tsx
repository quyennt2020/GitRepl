import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const moods = {
  thriving: { emoji: "🌿", label: "Thriving", description: "Growing vigorously" },
  happy: { emoji: "🌱", label: "Happy", description: "Healthy and content" },
  okay: { emoji: "😐", label: "Okay", description: "Stable but could be better" },
  struggling: { emoji: "🥀", label: "Struggling", description: "Showing signs of stress" },
  critical: { emoji: "⚠️", label: "Critical", description: "Needs immediate attention" },
};

type Mood = keyof typeof moods;

interface PlantMoodSelectorProps {
  value: Mood;
  onChange: (value: Mood) => void;
}

export default function PlantMoodSelector({ value, onChange }: PlantMoodSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(value) => onChange(value as Mood)}
      className="grid grid-cols-2 gap-4 sm:grid-cols-5"
    >
      {Object.entries(moods).map(([key, { emoji, label, description }]) => (
        <Label
          key={key}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer hover:bg-accent",
            value === key ? "border-primary bg-primary/5" : "border-muted"
          )}
          htmlFor={key}
        >
          <RadioGroupItem value={key} id={key} className="sr-only" />
          <span className="text-4xl">{emoji}</span>
          <span className="font-medium text-center">{label}</span>
          <span className="text-xs text-center text-muted-foreground">{description}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}

export { moods };
export type { Mood };
