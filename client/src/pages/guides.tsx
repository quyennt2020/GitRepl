import GuideCard from "@/components/GuideCard";

const GUIDES = [
  {
    title: "Watering Basics",
    image: "https://images.unsplash.com/photo-1604762524889-3e2fcc145683",
    description: "Learn the fundamentals of proper plant watering techniques."
  },
  {
    title: "Light Requirements",
    image: "https://images.unsplash.com/photo-1518335935020-cfd6580c1ab4",
    description: "Understanding different plants' sunlight needs."
  },
  {
    title: "Fertilizing Guide",
    image: "https://images.unsplash.com/photo-1592150621744-aca64f48394a",
    description: "Tips for proper plant nutrition and fertilization."
  },
  {
    title: "Common Problems",
    image: "https://images.unsplash.com/photo-1626965654957-fef1cb80d4b7",
    description: "Identifying and fixing common plant health issues."
  }
];

export default function Guides() {
  return (
    <div className="container mobile-container space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Plant Care Guides</h1>
      <div className="mobile-grid">
        {GUIDES.map(guide => (
          <GuideCard key={guide.title} {...guide} />
        ))}
      </div>
    </div>
  );
}
