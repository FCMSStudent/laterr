import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BookMarked, LayoutDashboard, Activity, CreditCard } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useHapticFeedback } from "@/shared/hooks/useHapticFeedback";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: BookMarked, label: "Bookmarks", path: "/bookmarks" },
  { icon: Activity, label: "Health", path: "/health" },
  { icon: CreditCard, label: "Subscriptions", path: "/subscriptions" },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const { trigger } = useHapticFeedback();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname === "/app" || location.pathname === "/dashboard";
    }
    return location.pathname === path;
  };

  const handlePress = (path: string) => {
    setPressedItem(path);
    trigger('light');
    navigate(path);
    // Reset after animation
    setTimeout(() => setPressedItem(null), 150);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-heavy pb-safe border-t border-white/15 shadow-[0_-8px_24px_rgba(0,0,0,0.15)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[72px] px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const isPressed = pressedItem === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handlePress(item.path)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-2xl transition-all duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground",
                isPressed && "scale-90"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-8 rounded-full transition-all duration-200",
                active && "bg-primary/15"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  active && "scale-110"
                )} aria-hidden="true" />
              </div>
              <span className={cn(
                "text-[11px] font-medium mt-0.5 transition-colors",
                active && "text-primary"
              )}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
