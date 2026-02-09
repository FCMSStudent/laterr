import { Badge } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/shared/components/ui";
import { ArrowUpDown, X, Filter, CreditCard, DollarSign } from "lucide-react";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { DEFAULT_CATEGORIES } from "@/features/subscriptions/constants";
import { memo } from "react";

export type SubscriptionSortOption = 
  | "date-asc" 
  | "date-desc" 
  | "amount-asc" 
  | "amount-desc" 
  | "name-asc" 
  | "name-desc"
  | "status";

interface SubscriptionFilterBarProps {
  selectedTag: string | null;
  selectedSort: SubscriptionSortOption;
  selectedCategory: string | null;
  onTagSelect: (tag: string | null) => void;
  onSortChange: (sort: SubscriptionSortOption) => void;
  onCategoryChange: (category: string | null) => void;
  onClearAll: () => void;
  availableTags?: string[];
}

// Mobile filter button for subscriptions
export const MobileSubscriptionFilterButton = memo(({
  selectedTag,
  selectedCategory,
  selectedSort,
  onTagSelect,
  onCategoryChange,
  onSortChange,
  onClearAll,
  availableTags = []
}: SubscriptionFilterBarProps) => {
  const hasActiveFilters = selectedTag || selectedCategory;
  const activeFilterCount = (selectedTag ? 1 : 0) + (selectedCategory ? 1 : 0);
  
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 shrink-0 active:scale-95 transition-transform relative"
        >
          <Filter className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Filters & Sort</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto p-4 space-y-6">
          {/* Categories Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(null)}
                className="min-h-[44px]"
              >
                All Categories
              </Button>
              {DEFAULT_CATEGORIES.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCategoryChange(category)}
                  className="min-h-[44px]"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags Section */}
          {availableTags.length > 0 && (
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
                {availableTags.map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => onTagSelect(tag)}
                    className="min-h-[44px]"
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sort Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Sort By</h3>
            <div className="flex flex-col gap-2">
              {[
                { value: "date-asc" as SubscriptionSortOption, label: "Next Billing (Soonest)" },
                { value: "date-desc" as SubscriptionSortOption, label: "Next Billing (Latest)" },
                { value: "amount-desc" as SubscriptionSortOption, label: "Amount (High to Low)" },
                { value: "amount-asc" as SubscriptionSortOption, label: "Amount (Low to High)" },
                { value: "name-asc" as SubscriptionSortOption, label: "Name (A-Z)" },
                { value: "name-desc" as SubscriptionSortOption, label: "Name (Z-A)" },
                { value: "status" as SubscriptionSortOption, label: "By Status" },
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
      </DrawerContent>
    </Drawer>
  );
});

MobileSubscriptionFilterButton.displayName = "MobileSubscriptionFilterButton";

// Desktop FilterBar component
export const SubscriptionFilterBar = memo(({
  selectedTag,
  selectedSort,
  selectedCategory,
  onTagSelect,
  onSortChange,
  onCategoryChange,
  onClearAll,
  availableTags = []
}: SubscriptionFilterBarProps) => {
  const hasActiveFilters = selectedTag || selectedCategory;
  const activeFilterCount = (selectedTag ? 1 : 0) + (selectedCategory ? 1 : 0);
  const isMobile = useIsMobile();

  const getSortLabel = (sort: SubscriptionSortOption) => {
    switch (sort) {
      case "date-asc":
        return "Next Billing (Soonest)";
      case "date-desc":
        return "Next Billing (Latest)";
      case "amount-desc":
        return "Amount (High to Low)";
      case "amount-asc":
        return "Amount (Low to High)";
      case "name-asc":
        return "Name (A-Z)";
      case "name-desc":
        return "Name (Z-A)";
      case "status":
        return "By Status";
      default:
        return "Sort";
    }
  };

  // Don't render desktop version on mobile
  if (isMobile) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      {/* Category Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CreditCard className="h-4 w-4" />
            {selectedCategory || "All Categories"}
            {selectedCategory && (
              <X
                className="h-3 w-3 ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onCategoryChange(null);
                }}
              />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onCategoryChange(null)}>
            All Categories
          </DropdownMenuItem>
          {DEFAULT_CATEGORIES.map(category => (
            <DropdownMenuItem
              key={category}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag Filter (if tags available) */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {availableTags.slice(0, 5).map(tag => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
            >
              #{tag}
            </Badge>
          ))}
          {availableTags.length > 5 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  +{availableTags.length - 5} more
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>More Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTags.slice(5).map(tag => (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => onTagSelect(tag)}
                  >
                    #{tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 ml-auto">
            <ArrowUpDown className="h-4 w-4" />
            {getSortLabel(selectedSort)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSortChange("date-asc")}>
            Next Billing (Soonest)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("date-desc")}>
            Next Billing (Latest)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSortChange("amount-desc")}>
            <DollarSign className="h-4 w-4 mr-2" />
            Amount (High to Low)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("amount-asc")}>
            <DollarSign className="h-4 w-4 mr-2" />
            Amount (Low to High)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSortChange("name-asc")}>
            Name (A-Z)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("name-desc")}>
            Name (Z-A)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSortChange("status")}>
            By Status
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
          Clear Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );
});

SubscriptionFilterBar.displayName = "SubscriptionFilterBar";
