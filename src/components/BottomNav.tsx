import { LayoutDashboard, BookOpen, Search, Settings, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const items = [
  { url: "/", icon: LayoutDashboard, label: "Home" },
  { url: "/journal", icon: BookOpen, label: "Journal" },
  { url: "/search", icon: Search, label: "Busca" },
  { url: "/habits", icon: Zap, label: "Hábitos" },
  { url: "/settings", icon: Settings, label: "Config" },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-subtle border-t border-border/50">
      <div className="flex items-center justify-around py-2 px-1">
        {items.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
