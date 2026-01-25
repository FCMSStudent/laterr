import { cn } from "@/shared/lib/utils";
import { Archive, Inbox, Trash2 } from "lucide-react";
import type { ItemStatus } from "@/features/bookmarks/types";

export type StatusFilter = ItemStatus | 'all';

interface StatusTabsProps {
    selectedStatus: StatusFilter;
    onStatusChange: (status: StatusFilter) => void;
    counts?: {
        active: number;
        archived: number;
        trashed: number;
    };
}

const statusTabs: { value: StatusFilter; label: string; icon: typeof Inbox }[] = [
    { value: 'active', label: 'Active', icon: Inbox },
    { value: 'archived', label: 'Archive', icon: Archive },
    { value: 'trashed', label: 'Trash', icon: Trash2 },
];

/**
 * Status filter tabs for switching between Active, Archive, and Trash views
 */
export const StatusTabs = ({
    selectedStatus,
    onStatusChange,
    counts,
}: StatusTabsProps) => {
    return (
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
            {statusTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = selectedStatus === tab.value;
                const count = counts?.[tab.value as keyof typeof counts];

                return (
                    <button
                        key={tab.value}
                        onClick={() => onStatusChange(tab.value)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                            isSelected
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                        aria-pressed={isSelected}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {count !== undefined && count > 0 && (
                            <span
                                className={cn(
                                    "text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center",
                                    isSelected
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {count > 99 ? '99+' : count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
