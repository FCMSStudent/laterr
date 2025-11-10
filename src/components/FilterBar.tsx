import { useState } from "react";
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
import { ArrowUpDown, Filter, X, FileText, Link2, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import type { ItemType } from "@/types";
import { CATEGORY_OPTIONS } from "@/constants";

export type SortOption = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "type";

interface FilterBarProps {
  selectedTag: string | null;
  selectedSort: SortOption;
  selectedTypeFilter: ItemType | null;
  onTagSelect: (tag: string | null) => void;
  onSortChange: (sort: SortOption) => void;
  onTypeFilterChange: (type: ItemType | null) => void;
  onClearAll: () => void;
}

export const FilterBar = ({
  selectedTag,
  selectedSort,
  selectedTypeFilter,
  onTagSelect,
  onSortChange,
  onTypeFilterChange,
  onClearAll,
}: FilterBarProps) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const hasActiveFilters = selectedTag || selectedTypeFilter;

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
      {/* Tag Filter Buttons */}
      <div className="flex flex-wrap gap-3 items-center justify-center">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground font-semibold">Tags:</span>
          <Button
            variant={!selectedTag ? "default" : "outline"}
            size="sm"
            onClick={() => onTagSelect(null)}
            className="h-8"
          >
            All
          </Button>
          {CATEGORY_OPTIONS.map((category) => (
            <Button
              key={category.value}
              variant={selectedTag === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => onTagSelect(category.value)}
              className="h-8"
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Toggle More Filters */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className="h-8"
        >
          <Filter className="h-3 w-3 mr-1" />
          More Filters
          {showMoreFilters ? (
            <ChevronUp className="h-3 w-3 ml-1" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-1" />
          )}
        </Button>
      </div>

      {/* Collapsible More Filters Section */}
      {showMoreFilters && (
        <div className="flex flex-wrap gap-3 items-center justify-center animate-in fade-in slide-in-from-top-2 duration-200">
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
      )}

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">Active Filters:</span>
          
          {selectedTag && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs"
              onClick={() => onTagSelect(null)}
            >
              #{selectedTag}
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
