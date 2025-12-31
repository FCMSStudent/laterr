import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ArrowUpDown, X, ChevronDown } from "lucide-react";
import { SUBSCRIPTION_CATEGORIES, BILLING_CYCLES, SUBSCRIPTION_STATUSES } from "../types";
import type { BillingCycle, SubscriptionStatus } from "../types";

export type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "name-asc" | "name-desc";

interface SubscriptionFilterBarProps {
  selectedCategory: string | null;
  selectedStatus: SubscriptionStatus | null;
  selectedBillingCycle: BillingCycle | null;
  selectedSort: SortOption;
  onCategorySelect: (category: string | null) => void;
  onStatusSelect: (status: SubscriptionStatus | null) => void;
  onBillingCycleSelect: (cycle: BillingCycle | null) => void;
  onSortChange: (sort: SortOption) => void;
  onClearAll: () => void;
}

export const SubscriptionFilterBar = ({
  selectedCategory,
  selectedStatus,
  selectedBillingCycle,
  selectedSort,
  onCategorySelect,
  onStatusSelect,
  onBillingCycleSelect,
  onSortChange,
  onClearAll,
}: SubscriptionFilterBarProps) => {
  const hasActiveFilters = selectedCategory || selectedStatus || selectedBillingCycle;

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "date-desc":
        return "Newest First";
      case "date-asc":
        return "Oldest First";
      case "amount-desc":
        return "Highest Amount";
      case "amount-asc":
        return "Lowest Amount";
      case "name-asc":
        return "Name (A-Z)";
      case "name-desc":
        return "Name (Z-A)";
      default:
        return "Sort";
    }
  };

  const getSelectedCategoryLabel = () => {
    if (!selectedCategory) return "All Categories";
    const category = SUBSCRIPTION_CATEGORIES.find(cat => cat.value === selectedCategory);
    return category?.label ?? selectedCategory;
  };

  const getSelectedStatusLabel = () => {
    if (!selectedStatus) return "All Status";
    const status = SUBSCRIPTION_STATUSES.find(s => s.value === selectedStatus);
    return status?.label ?? selectedStatus;
  };

  const getSelectedBillingCycleLabel = () => {
    if (!selectedBillingCycle) return "All Cycles";
    const cycle = BILLING_CYCLES.find(c => c.value === selectedBillingCycle);
    return cycle?.label ?? selectedBillingCycle;
  };

  return (
    <div className="space-y-2">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-start gap-[10px]">
        {/* Category Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={selectedCategory ? "default" : "outline"} size="sm">
              {getSelectedCategoryLabel()}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onCategorySelect(null)}>
              All Categories
            </DropdownMenuItem>
            {SUBSCRIPTION_CATEGORIES.map(category => (
              <DropdownMenuItem
                key={category.value}
                onClick={() => onCategorySelect(category.value)}
              >
                {category.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={selectedStatus ? "default" : "outline"} size="sm">
              {getSelectedStatusLabel()}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusSelect(null)}>
              All Status
            </DropdownMenuItem>
            {SUBSCRIPTION_STATUSES.map(status => (
              <DropdownMenuItem
                key={status.value}
                onClick={() => onStatusSelect(status.value as SubscriptionStatus)}
              >
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Billing Cycle Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={selectedBillingCycle ? "default" : "outline"} size="sm">
              {getSelectedBillingCycleLabel()}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel>Filter by Cycle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onBillingCycleSelect(null)}>
              All Cycles
            </DropdownMenuItem>
            {BILLING_CYCLES.map(cycle => (
              <DropdownMenuItem
                key={cycle.value}
                onClick={() => onBillingCycleSelect(cycle.value as BillingCycle)}
              >
                {cycle.label}
              </DropdownMenuItem>
            ))}
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
            <DropdownMenuItem onClick={() => onSortChange("amount-desc")}>
              Highest Amount
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("amount-asc")}>
              Lowest Amount
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("name-asc")}>
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("name-desc")}>
              Name (Z-A)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">Active Filters:</span>

          {selectedCategory && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs min-h-[44px] inline-flex items-center"
              onClick={() => onCategorySelect(null)}
            >
              {getSelectedCategoryLabel()}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}

          {selectedStatus && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs min-h-[44px] inline-flex items-center capitalize"
              onClick={() => onStatusSelect(null)}
            >
              {selectedStatus}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}

          {selectedBillingCycle && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/10 premium-transition text-xs min-h-[44px] inline-flex items-center capitalize"
              onClick={() => onBillingCycleSelect(null)}
            >
              {selectedBillingCycle}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};
