import { Link, useLocation } from "wouter";
import { Home, Sprout, Calendar, Book, Map, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/plants", icon: Sprout, label: "Plants" },
  { href: "/location-map", icon: Map, label: "Locations" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/guides", icon: Book, label: "Guides" },
  { href: "/settings", icon: Settings, label: "Settings" }
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="container flex justify-between items-center h-16">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <a className={`flex flex-col items-center gap-1 px-3 py-2 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}