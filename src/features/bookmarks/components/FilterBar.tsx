import { Badge } from "@/ui";
import { Button } from "@/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/ui";
import { ArrowUpDown, X, FileText, Link2, Image as ImageIcon, ChevronDown, Filter, LayoutGrid, LayoutList, CheckSquare } from "lucide-react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import type { ItemType } from "@/features/bookmarks/types";
import { CATEGORY_OPTIONS } from "@/features/bookmarks/constants";
import { ReactNode } from "react";
export type SortOption = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "type";
export type ViewMode = "grid" | "list";
interface FilterBarProps {
  selectedTag: string | null;
  selectedSort: SortOption;
  selectedTypeFilter: ItemType | null;
  onTagSelect: (tag: string | null) => void;
  onSortChange: (sort: SortOption) => void;
  onTypeFilterChange: (type: ItemType | null) => void;
  onClearAll: () => void;
  // New props for collapsible mode
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  // View mode props (hidden from UI but kept for functionality)
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  // Selection mode props (removed from UI, triggered by long-press)
  isSelectionMode?: boolean;
  selectedCount?: number;
  onSelectionModeToggle?: () => void;
  // Hide mobile controls when they're rendered in header
  hideMobileControls?: boolean;
}

// Separate component for mobile filter button to be used in header
export const MobileFilterButton = ({
  selectedTag,
  selectedTypeFilter,
  selectedSort,
  onTagSelect,
  onTypeFilterChange,
  onSortChange,
  onClearAll
}: {
  selectedTag: string | null;
  selectedTypeFilter: ItemType | null;
  selectedSort: SortOption;
  onTagSelect: (tag: string | null) => void;
  onTypeFilterChange: (type: ItemType | null) => void;
  onSortChange: (sort: SortOption) => void;
  onClearAll: () => void;
}) => {
  const hasActiveFilters = selectedTag || selectedTypeFilter;
  const activeFilterCount = (selectedTag ? 1 : 0) + (selectedTypeFilter ? 1 : 0);
  return <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 active:scale-95 transition-transform relative">
          <Filter className="h-5 w-5" />
          {activeFilterCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </Badge>}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Filters & Sort</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto p-4 space-y-6">
          {/* Tags Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Filter by Tag</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant={!selectedTag ? "default" : "outline"} size="sm" onClick={() => onTagSelect(null)} className="min-h-[44px]">
                All Tags
              </Button>
              {CATEGORY_OPTIONS.map(category => <Button key={category.value} variant={selectedTag === category.value ? "default" : "outline"} size="sm" onClick={() => onTagSelect(category.value)} className="min-h-[44px]">
                  {category.label}
                </Button>)}
            </div>
          </div>

          {/* Type Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Filter by Type</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant={!selectedTypeFilter ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange(null)} className="min-h-[44px]">
                All Types
              </Button>
              <Button variant={selectedTypeFilter === "url" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("url")} className="min-h-[44px]">
                <Link2 className="h-3 w-3 mr-2" />
                URL
              </Button>
              <Button variant={selectedTypeFilter === "note" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("note")} className="min-h-[44px]">
                <FileText className="h-3 w-3 mr-2" />
                Note
              </Button>
              <Button variant={selectedTypeFilter === "document" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("document")} className="min-h-[44px]">
                <FileText className="h-3 w-3 mr-2" />
                Document
              </Button>
              <Button variant={selectedTypeFilter === "image" ? "default" : "outline"} size="sm" onClick={() => onTypeFilterChange("image")} className="min-h-[44px]">
                <ImageIcon className="h-3 w-3 mr-2" />
                Image
              </Button>
            </div>
          </div>

          {/* Sort Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Sort By</h3>
            <div className="flex flex-col gap-2">
              {[{
              value: "date-desc" as SortOption,
              label: "Newest First"
            }, {
              value: "date-asc" as SortOption,
              label: "Oldest First"
            }, {
              value: "title-asc" as SortOption,
              label: "Title (A-Z)"
            }, {
              value: "title-desc" as SortOption,
              label: "Title (Z-A)"
            }, {
              value: "type" as SortOption,
              label: "By Type"
            }].map(option => <Button key={option.value} variant={selectedSort === option.value ? "default" : "outline"} size="sm" onClick={() => onSortChange(option.value)} className="min-h-[44px] justify-start">
                  {option.label}
                </Button>)}
            </div>
          </div>

          {/* Clear All */}
          {hasActiveFilters && <Button variant="destructive" size="sm" onClick={onClearAll} className="w-full min-h-[44px]">
              Clear All Filters
            </Button>}
        </div>
      </DrawerContent>
    </Drawer>;
};

// Separate component for mobile sort button
export const MobileSortButton = ({
  selectedSort,
  onSortChange
}: {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}) => {
  return <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 active:scale-95 transition-transform">
          <ArrowUpDown className="h-5 w-5" />
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
    </DropdownMenu>;
};
export const FilterBar = ({
  selectedTag,
  selectedSort,
  selectedTypeFilter,
  onTagSelect,
  onSortChange,
  onTypeFilterChange,
  onClearAll,
  collapsed = false,
  onToggleCollapse,
  viewMode = "grid",
  onViewModeChange,
  isSelectionMode = false,
  selectedCount = 0,
  onSelectionModeToggle,
  hideMobileControls = false
}: FilterBarProps) => {
  const hasActiveFilters = selectedTag || selectedTypeFilter;
  const activeFilterCount = (selectedTag ? 1 : 0) + (selectedTypeFilter ? 1 : 0);
  const isMobile = useIsMobile();
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

  // On mobile, if controls are in header, only show active filter pills
  if (isMobile && hideMobileControls) {
    if (!hasActiveFilters) return null;
    return <div className="flex flex-wrap gap-2 items-center justify-center py-2">
        <span className="text-xs text-muted-foreground font-medium">Active:</span>
        
        {selectedTag && <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs" onClick={() => onTagSelect(null)}>
            #{selectedTag}
            <X className="h-3 w-3 ml-1" />
          </Badge>}
        
        {selectedTypeFilter && <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs flex items-center gap-1" onClick={() => onTypeFilterChange(null)}>
            {getTypeIcon(selectedTypeFilter)}
            {selectedTypeFilter.charAt(0).toUpperCase() + selectedTypeFilter.slice(1)}
            <X className="h-3 w-3 ml-1" />
          </Badge>}
        
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
          Clear
        </Button>
      </div>;
  }

  // On mobile with hideMobileControls, hide the entire FilterBar
  if (isMobile && hideMobileControls) {
    return null;
  }
  return <div className="space-y-2">
      {/* Collapsed mode: Show only Filters button with badge - desktop only */}
      {collapsed && onToggleCollapse ? <div className="flex items-center justify-center">
          <Button variant="outline" size="sm" onClick={onToggleCollapse} className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {activeFilterCount}
              </Badge>}
          </Button>
        </div> : <>
          {/* Desktop: Expanded filter controls */}
          {!isMobile}
        </>}

      {/* Active Filter Pills */}
      {hasActiveFilters && !isMobile && <div className="flex flex-wrap gap-2 items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">Active Filters:</span>
          
          {selectedTag && <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs" onClick={() => onTagSelect(null)}>
              #{selectedTag}
              <X className="h-3 w-3 ml-1" />
            </Badge>}
          
          {selectedTypeFilter && <Badge variant="secondary" className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs flex items-center gap-1" onClick={() => onTypeFilterChange(null)}>
              {getTypeIcon(selectedTypeFilter)}
              {selectedTypeFilter.charAt(0).toUpperCase() + selectedTypeFilter.slice(1)}
              <X className="h-3 w-3 ml-1" />
            </Badge>}
          
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
            Clear All
          </Button>
        </div>}
    </div>;
};