import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Filter, X, Clock, FileText, Link2, Image as ImageIcon } from "lucide-react";
import type { ItemType } from "@/types";

export type SortOption = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "type";
export type QuickFilter = "all" | "recent" | "watch-later" | "read-later" | "wishlist";

interface FilterBarProps {
  selectedTag: string | null;
  selectedSort: SortOption;
  selectedQuickFilter: QuickFilter;
  selectedTypeFilter: ItemType | null;
  onTagClear: () => void;
  onSortChange: (sort: SortOption) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onTypeFilterChange: (type: ItemType | null) => void;
  onClearAll: () => void;
}

export const FilterBar = ({
  selectedTag,
  selectedSort,
  selectedQuickFilter,
  selectedTypeFilter,
  onTagClear,
  onSortChange,
  onQuickFilterChange,
  onTypeFilterChange,
  onClearAll,
}: FilterBarProps) => {
  const hasActiveFilters = selectedTag || selectedQuickFilter !== "all" || selectedTypeFilter;

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "date-desc":
        return "Newest First";
      case "date-asc":
        return "Oldest First";
      case "title-asc":
        return "Title (A-Z)";
      case "title-desc":
        return "Title (Z-A)";
      case "type":
        return "By Type";
      default:
        return "Sort";
    }
  };

  const getTypeIcon = (type: ItemType) => {
    switch (type) {
      case "url":
        return <Link2 className="h-3 w-3" />;
      case "note":
      case "document":
      case "file":
        return <FileText className="h-3 w-3" />;
      case "image":
        return <ImageIcon className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Filters and Sort */}
      <div className="flex flex-wrap gap-3 items-center justify-center">
        {/* Quick Filter Buttons */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground font-semibold">Quick:</span>
          <Button
            variant={selectedQuickFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickFilterChange("all")}
            className="h-8"
          >
            All
          </Button>
          <Button
            variant={selectedQuickFilter === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickFilterChange("recent")}
            className="h-8"
          >
            <Clock className="h-3 w-3 mr-1" />
            Recent
          </Button>
          <Button
            variant={selectedQuickFilter === "read-later" ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickFilterChange("read-later")}
            className="h-8"
          >
            📖 Read Later
          </Button>
          <Button
            variant={selectedQuickFilter === "watch-later" ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickFilterChange("watch-later")}
            className="h-8"
          >
            ⏰ Watch Later
          </Button>
          <Button
            variant={selectedQuickFilter === "wishlist" ? "default" : "outline"}
            size="sm"
            onClick={() => onQuickFilterChange("wishlist")}
            className="h-8"
          >
            ⭐ Wishlist
          </Button>
        </div>

        {/* Type Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={selectedTypeFilter ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              <Filter className="h-3 w-3 mr-1" />
              {selectedTypeFilter ? selectedTypeFilter.charAt(0).toUpperCase() + selectedTypeFilter.slice(1) : "Type"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTypeFilterChange(null)}>
              All Types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeFilterChange("url")}>
              <Link2 className="h-3 w-3 mr-2" />
              URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeFilterChange("note")}>
              <FileText className="h-3 w-3 mr-2" />
              Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeFilterChange("document")}>
              <FileText className="h-3 w-3 mr-2" />
              Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTypeFilterChange("image")}>
              <ImageIcon className="h-3 w-3 mr-2" />
              Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              {getSortLabel(selectedSort)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSortChange("date-desc")}>
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("date-asc")}>
              Oldest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("title-asc")}>
              Title (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("title-desc")}>
              Title (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("type")}>
              By Type
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">Active Filters:</span>
          
          {selectedTag && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs"
              onClick={onTagClear}
            >
              #{selectedTag}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          
          {selectedQuickFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs"
              onClick={() => onQuickFilterChange("all")}
            >
              {selectedQuickFilter === "recent" && "Recent"}
              {selectedQuickFilter === "read-later" && "📖 Read Later"}
              {selectedQuickFilter === "watch-later" && "⏰ Watch Later"}
              {selectedQuickFilter === "wishlist" && "⭐ Wishlist"}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          
          {selectedTypeFilter && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs flex items-center gap-1"
              onClick={() => onTypeFilterChange(null)}
            >
              {getTypeIcon(selectedTypeFilter)}
              {selectedTypeFilter.charAt(0).toUpperCase() + selectedTypeFilter.slice(1)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};
