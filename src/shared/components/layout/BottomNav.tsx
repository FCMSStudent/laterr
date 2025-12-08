import { Home, Bookmark, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface BottomNavProps {
  onAddItem: () => void;
  onShowAllItems: () => void;
  onShowBookmarks: () => void;
  activeView: "all" | "bookmarks";
}

export const BottomNav = ({ onAddItem, onShowAllItems, onShowBookmarks, activeView }: BottomNavProps) => {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t border-border shadow-lg"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* All Items */}
        <button
          onClick={onShowAllItems}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[44px] min-h-[44px]",
            activeView === "all" 
              ? "text-primary bg-primary/10" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          aria-label="View all items"
          aria-current={activeView === "all" ? "page" : undefined}
        >
          <Home className="w-6 h-6" aria-hidden="true" />
          <span className="text-xs font-medium">All</span>
        </button>

        {/* Add Item - Center with emphasis */}
        <button
          onClick={onAddItem}
          className="flex flex-col items-center justify-center gap-1 px-6 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 min-w-[52px] min-h-[52px]"
          aria-label="Add new item"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
          <span className="text-xs font-semibold">Add</span>
        </button>

        {/* Bookmarks */}
        <button
          onClick={onShowBookmarks}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[44px] min-h-[44px]",
            activeView === "bookmarks" 
              ? "text-primary bg-primary/10" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          aria-label="View bookmarked items"
          aria-current={activeView === "bookmarks" ? "page" : undefined}
        >
          <Bookmark className="w-6 h-6" aria-hidden="true" />
          <span className="text-xs font-medium">Saved</span>
        </button>
      </div>
    </nav>
  );
};
