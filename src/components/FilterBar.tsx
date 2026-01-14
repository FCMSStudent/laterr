import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ArrowUpDown, X, FileText, Link2, Image as ImageIcon, ChevronDown, Filter, LayoutGrid, LayoutList, CheckSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ItemType } from "@/types";
import { CATEGORY_OPTIONS } from "@/constants";

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
  // New props for view mode and selection
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  isSelectionMode?: boolean;
  selectedCount?: number;
  onSelectionModeToggle?: () => void;
}
export const FilterBar = ({
  selectedTag,
  selectedSort,
  selectedTypeFilter,
  onTagSelect,
  onSortChange,
  onTypeFilterChange,
  onClearAll,
  viewMode = "grid",
  onViewModeChange,
  isSelectionMode = false,
  selectedCount = 0,
  onSelectionModeToggle
}: FilterBarProps) => {
  const hasActiveFilters = selectedTag || selectedTypeFilter;
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

  // Mobile filter drawer content
  const FilterContent = () => (
    <div className="space-y-6 p-4">
      {/* Tags Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Filter by Tag</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!selectedTag ? "default" : "outline"}
            size="sm"
            onClick={() => onTagSelect(null)}
            className="min-h-[44px]"
          >
            All Tags
          </Button>
          {CATEGORY_OPTIONS.map(category => (
            <Button
              key={category.value}
              variant={selectedTag === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => onTagSelect(category.value)}
              className="min-h-[44px]"
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Type Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Filter by Type</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!selectedTypeFilter ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeFilterChange(null)}
            className="min-h-[44px]"
          >
            All Types
          </Button>
          <Button
            variant={selectedTypeFilter === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeFilterChange("url")}
            className="min-h-[44px]"
          >
            <Link2 className="h-3 w-3 mr-2" />
            URL
          </Button>
          <Button
            variant={selectedTypeFilter === "note" ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeFilterChange("note")}
            className="min-h-[44px]"
          >
            <FileText className="h-3 w-3 mr-2" />
            Note
          </Button>
          <Button
            variant={selectedTypeFilter === "document" ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeFilterChange("document")}
            className="min-h-[44px]"
          >
            <FileText className="h-3 w-3 mr-2" />
            Document
          </Button>
          <Button
            variant={selectedTypeFilter === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeFilterChange("image")}
            className="min-h-[44px]"
          >
            <ImageIcon className="h-3 w-3 mr-2" />
            Image
          </Button>
        </div>
      </div>

      {/* Sort Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Sort By</h3>
        <div className="flex flex-col gap-2">
          {[
            { value: "date-desc" as SortOption, label: "Newest First" },
            { value: "date-asc" as SortOption, label: "Oldest First" },
            { value: "title-asc" as SortOption, label: "Title (A-Z)" },
            { value: "title-desc" as SortOption, label: "Title (Z-A)" },
            { value: "type" as SortOption, label: "By Type" },
          ].map(option => (
            <Button
              key={option.value}
              variant={selectedSort === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange(option.value)}
              className="min-h-[44px] justify-start"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onClearAll}
          className="w-full min-h-[44px]"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );
  return <div className="space-y-2">
      {/* Mobile: Single Filters button that opens drawer */}
      {isMobile ? (
        <div className="flex items-center justify-between gap-2">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-[44px] flex-1">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (() => {
                  const activeFilterCount = (selectedTag ? 1 : 0) + (selectedTypeFilter ? 1 : 0);
                  return (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      {activeFilterCount}
                    </Badge>
                  );
                })()}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle>Filters & Sort</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto">
                <FilterContent />
              </div>
            </DrawerContent>
          </Drawer>

          {/* Sort dropdown on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <ArrowUpDown className="h-4 w-4" />
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
      ) : (
        /* Desktop: Original single-line filter controls */
        <div className="flex-wrap flex-row flex items-center justify-between gap-[10px] border-0 shadow-none rounded-none opacity-100 text-primary bg-white/[0.01]">
          <div className="flex items-center gap-2">
            {/* Tags Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={selectedTag ? "default" : "outline"} size="sm" className="h-8">
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
                <Button variant={selectedTypeFilter ? "default" : "outline"} size="sm" className="h-8">
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

            {/* Selection Mode Toggle */}
            {onSelectionModeToggle && (
              <Button
                variant={isSelectionMode ? "default" : "outline"}
                size="sm"
                onClick={onSelectionModeToggle}
                className="h-8"
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                {isSelectionMode ? `${selectedCount} Selected` : 'Select'}
              </Button>
            )}
          </div>

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="h-7 w-7 p-0"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="h-7 w-7 p-0"
                aria-label="List view"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Pills */}
      {hasActiveFilters && <div className="flex flex-wrap gap-2 items-center justify-center">
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