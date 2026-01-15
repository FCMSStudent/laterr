import { Clock, ChevronRight } from "lucide-react";
import type { Item } from "@/features/bookmarks/types";
import { Badge } from "./ui/badge";
import { formatDistanceToNow } from "date-fns";

interface RecentlyViewedSectionProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

export const RecentlyViewedSection = ({ items, onItemClick }: RecentlyViewedSectionProps) => {
  if (items.length === 0) return null;

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <section className="mb-6" aria-label="Recently viewed items">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Recently Viewed
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="flex-shrink-0 w-48 snap-start glass-card rounded-xl p-3 text-left hover:scale-[1.02] premium-transition hover:shadow-lg group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <div className="flex items-start gap-2 mb-2">
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {item.type}
              </Badge>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-auto group-hover:translate-x-0.5 premium-transition" />
            </div>
            <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground/70">
              {formatDate(item.updated_at || item.created_at)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};
