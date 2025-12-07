import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpDown, X, FileText, Link2, Image as ImageIcon, ChevronDown } from "lucide-react";
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
  onClearAll
}: FilterBarProps) => {
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
  const getSelectedTagLabel = () => {
    if (!selectedTag) return "All Tags";
    const category = CATEGORY_OPTIONS.find(cat => cat.value === selectedTag);
    return category ? category.label : selectedTag;
  };
  const getTypeLabel = (type: ItemType | null) => {
    if (!type) return "Type";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  return <div className="space-y-2">
      {/* Single-Line Filter Controls */}
      <div className="flex-wrap flex-row flex items-center justify-start gap-[10px] border-0 shadow-none rounded-none opacity-100 text-primary bg-white/[0.01]">
        {/* Tags Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={selectedTag ? "default" : "outline"} size="sm">
              {getSelectedTagLabel()}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTagSelect(null)}>
              All Tags
            </DropdownMenuItem>
            {CATEGORY_OPTIONS.map(category => <DropdownMenuItem key={category.value} onClick={() => onTagSelect(category.value)}>
                {category.label}
              </DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={selectedTypeFilter ? "default" : "outline"} size="sm">
              {getTypeLabel(selectedTypeFilter)}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
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
            <Button variant="outline" size="sm">
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
      {hasActiveFilters && <div className="flex flex-wrap gap-2 items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">Active Filters:</span>
          
          {selectedTag && <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs min-h-[44px] inline-flex items-center" onClick={() => onTagSelect(null)}>
              #{selectedTag}
              <X className="h-3 w-3 ml-1" />
            </Badge>}
          
          {selectedTypeFilter && <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs flex items-center gap-1 min-h-[44px]" onClick={() => onTypeFilterChange(null)}>
              {getTypeIcon(selectedTypeFilter)}
              {selectedTypeFilter.charAt(0).toUpperCase() + selectedTypeFilter.slice(1)}
              <X className="h-3 w-3 ml-1" />
            </Badge>}
          
          <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground">
            Clear All
          </Button>
        </div>}
    </div>;
};