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
      className="fixed bottom-4 left-4 right-4 z-50 md:hidden rounded-[22px] border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)]"
      style={{
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        background: 'rgba(255,255,255,0.55)',
      }}
      aria-label="Mobile navigation"
    >
      {/* Dark mode override */}
      <style>{`
        @media (prefers-color-scheme: dark) {
          [data-liquid-nav] {
            background: rgba(30,30,30,0.55) !important;
          }
        }
        .dark [data-liquid-nav] {
          background: rgba(30,30,30,0.55) !important;
        }
      `}</style>
      <div data-liquid-nav className="flex items-center justify-around h-[64px] px-1 rounded-[22px]"
        style={{
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          background: 'rgba(255,255,255,0.55)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const isPressed = pressedItem === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handlePress(item.path)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-3 py-1.5 rounded-2xl transition-all duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground",
                isPressed && "scale-90"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                active && "bg-primary/15"
              )}>
                <Icon className={cn(
                  "w-[22px] h-[22px] transition-transform duration-200",
                  active && "scale-110"
                )} aria-hidden="true" />
              </div>
              <span className={cn(
                "text-[10px] font-semibold mt-0.5 transition-colors",
                active && "text-primary"
              )}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
